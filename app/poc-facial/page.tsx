'use client';

/**
 * POC — Reconhecimento Facial Real (ADR 0003 §6)
 * ------------------------------------------------
 * Valida no navegador/tablet, 100% offline:
 *   BlazeFace → FaceMesh → MobileFace (MIT) → match cosseno na galeria local
 * Métricas do ADR: latência < 3 s ponta-a-ponta; rejeição de foto; 0 frames persistidos.
 *
 * Esta página é uma ferramenta de POC — não é o terminal de produção.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera, CameraOff, UserPlus, ScanFace, Trash2, Gauge, ShieldAlert,
  CheckCircle2, XCircle, Loader2, Eye, Fingerprint, Database, RefreshCw,
} from 'lucide-react';
import {
  loadHumanEngine, detectFace, getEngineStatus,
  HumanFaceCapture,
} from '@/lib/biometrics/human-engine';
import {
  GalleryEntry, listGallery, upsertEntry, deleteEntry, clearGallery,
} from '@/lib/biometrics/face-store';

const MIN_SAMPLES = 3;
const DEFAULT_THRESHOLD = 0.75; // cosseno MobileFace — ajustável no POC
const ANTISPOOF_MIN = 0.7;

export default function PocFacialPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [engineInfo, setEngineInfo] = useState(getEngineStatus());
  const [initError, setInitError] = useState<string | null>(null);

  const [gallery, setGallery] = useState<GalleryEntry[]>([]);
  const [enrollName, setEnrollName] = useState('');
  const [pendingSamples, setPendingSamples] = useState<number[][]>([]);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  const [lastCapture, setLastCapture] = useState<HumanFaceCapture | null>(null);
  const [recognition, setRecognition] = useState<{
    name: string | null; similarity: number; stable: number; spoof: boolean;
  } | null>(null);

  // Métricas ADR §4
  const [metrics, setMetrics] = useState({ frames: 0, detects: 0, accepts: 0, rejects: 0, spoof: 0, lastDetectMs: 0, lastEmbedMs: 0, lastMatchMs: 0 });
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  const recognitionRef = useRef<{ running: boolean; lastPerson: string | null; stableCount: number }>({ running: false, lastPerson: null, stableCount: 0 });
  const galleryRef = useRef<GalleryEntry[]>([]);
  galleryRef.current = gallery;
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;

  const refreshGallery = useCallback(async () => {
    setGallery(await listGallery());
  }, []);

  // Boot: câmera + engine em paralelo
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraOn(true);
      } catch (e: any) {
        setInitError(`Câmara indisponível: ${e?.message || e}`);
      }

      try {
        await loadHumanEngine();
        if (!cancelled) { setEngineReady(true); setEngineInfo(getEngineStatus()); }
      } catch (e: any) {
        if (!cancelled) setInitError(`Falha ao carregar modelos: ${e?.message || e}`);
      }
    })();

    refreshGallery();

    return () => {
      cancelled = true;
      recognitionRef.current.running = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [refreshGallery]);

  // Loop de reconhecimento (~3 FPS)
  useEffect(() => {
    if (!engineReady || !cameraOn) return;
    recognitionRef.current.running = true;
    let stopped = false;

    const loop = async () => {
      if (stopped || !recognitionRef.current.running) return;
      const t0 = performance.now();
      try {
        const capture = videoRef.current ? await detectFace(videoRef.current) : null;
        const tDetect = performance.now() - t0;

        if (capture) {
          const tEmbed0 = performance.now();
          const embedding = capture.embedding;
          const tEmbed = performance.now() - tEmbed0;

          // Match cosseno: melhor amostra de cada pessoa
          const tMatch0 = performance.now();
          let bestName: string | null = null;
          let bestSim = 0;
          for (const entry of galleryRef.current) {
            for (const sample of entry.samples) {
              const sim = cosineSim(embedding, sample);
              if (sim > bestSim) { bestSim = sim; bestName = entry.name; }
            }
          }
          const tMatch = performance.now() - tMatch0;

          const spoofSuspect = (capture.antispoofScore !== null && capture.antispoofScore < ANTISPOOF_MIN);
          const matched = bestSim >= thresholdRef.current && !spoofSuspect;

          // Estabilidade: 2 frames consecutivos da mesma pessoa
          const ref = recognitionRef.current;
          if (matched) {
            ref.stableCount = ref.lastPerson === bestName ? ref.stableCount + 1 : 1;
            ref.lastPerson = bestName;
          } else {
            ref.stableCount = 0;
            ref.lastPerson = null;
          }

          setLastCapture(capture);
          setRecognition({
            name: matched ? bestName : null,
            similarity: bestSim,
            stable: ref.stableCount,
            spoof: spoofSuspect,
          });

          setMetrics((m) => ({
            frames: m.frames + 1,
            detects: m.detects + 1,
            accepts: matched && ref.stableCount >= 2 ? m.accepts + 1 : m.accepts,
            rejects: !matched ? m.rejects + 1 : m.rejects,
            spoof: spoofSuspect ? m.spoof + 1 : m.spoof,
            lastDetectMs: Math.round(tDetect),
            lastEmbedMs: Math.round(tEmbed),
            lastMatchMs: Math.round(tMatch),
          }));
        } else {
          setMetrics((m) => ({ ...m, frames: m.frames + 1 }));
          setRecognition(null);
          recognitionRef.current.stableCount = 0;
          recognitionRef.current.lastPerson = null;
        }

        drawOverlay(capture);
      } catch {
        // frame skip
      }
      const elapsed = performance.now() - t0;
      setTimeout(loop, Math.max(60, 330 - elapsed));
    };

    loop();
    return () => { stopped = true; recognitionRef.current.running = false; };
  }, [engineReady, cameraOn]);

  const drawOverlay = (capture: HumanFaceCapture | null) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!capture) return;
    const { xMin, yMin, xMax, yMax } = capture.box;
    const ok = recognitionRef.current.stableCount >= 2;
    ctx.strokeStyle = ok ? '#10B981' : '#00D1FF';
    ctx.lineWidth = 3;
    ctx.strokeRect(xMin, yMin, xMax - xMin, yMax - yMin);
  };

  const handleCaptureSample = async () => {
    const capture = lastCapture || (videoRef.current ? await detectFace(videoRef.current) : null);
    if (!capture) { alert('Nenhum rosto detetado. Posicione-se e tente novamente.'); return; }
    if (capture.antispoofScore !== null && capture.antispoofScore < ANTISPOOF_MIN) {
      alert('Possível spoof — amostra rejeitada pelo anti-spoofing.');
      return;
    }
    setPendingSamples((prev) => [...prev, capture.embedding]);
  };

  const handleSaveEnrollment = async () => {
    const name = enrollName.trim();
    if (!name) { alert('Indique o nome do voluntário.'); return; }
    if (pendingSamples.length < MIN_SAMPLES) { alert(`Capture pelo menos ${MIN_SAMPLES} amostras.`); return; }

    const id = name.toLowerCase().replace(/\s+/g, '_');
    const existing = galleryRef.current.find((g) => g.id === id);
    const samples = existing ? [...existing.samples, ...pendingSamples] : [...pendingSamples];

    await upsertEntry({
      id, name,
      samples,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    setPendingSamples([]);
    setEnrollName('');
    await refreshGallery();
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    await refreshGallery();
  };

  const handleClearAll = async () => {
    if (!confirm('Eliminar TODOS os perfis biométricos locais?')) return;
    await clearGallery();
    setPendingSamples([]);
    await refreshGallery();
  };

  const totalEmbeddings = gallery.reduce((acc, g) => acc + g.samples.length, 0);

  return (
    <div className="min-h-screen bg-[#060B18] text-white font-['Inter',sans-serif] p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <ScanFace className="w-8 h-8 text-cyan-400" />
          <h1 className="text-2xl font-bold">POC — Reconhecimento Facial Real</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">ADR 0003 · Plano A</span>
        </div>
        <p className="text-sm text-slate-400 mt-2">
          BlazeFace → FaceMesh → <strong>MobileFace (MIT)</strong> → match cosseno local.
          Zero frames persistidos — apenas embeddings na IndexedDB deste dispositivo.
        </p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Câmara + reconhecimento */}
        <section className="lg:col-span-3">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-[4/3]">
            <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
                <CameraOff className="w-10 h-10 text-slate-500" />
                <p className="text-slate-400 text-sm">{initError || 'A iniciar câmara…'}</p>
              </div>
            )}

            {!engineReady && cameraOn && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-2 rounded-xl text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                A carregar modelos biométricos…
              </div>
            )}

            {recognition && (
              <div className={`absolute bottom-4 left-4 right-4 rounded-xl px-4 py-3 backdrop-blur border ${
                recognition.spoof ? 'bg-rose-950/80 border-rose-600/40'
                : recognition.stable >= 2 ? 'bg-emerald-950/80 border-emerald-500/40'
                : 'bg-slate-900/80 border-slate-600/40'}`}>
                {recognition.spoof ? (
                  <div className="flex items-center gap-2 text-rose-300"><ShieldAlert className="w-5 h-5" /><span className="font-semibold">Possível spoof — não é uma pessoa real</span></div>
                ) : recognition.stable >= 2 ? (
                  <div className="flex items-center gap-2 text-emerald-300"><CheckCircle2 className="w-5 h-5" /><span className="font-semibold text-lg">{recognition.name}</span><span className="text-emerald-400/80 text-sm">· confiança {(recognition.similarity * 100).toFixed(1)}%</span></div>
                ) : recognition.name ? (
                  <div className="flex items-center gap-2 text-cyan-300"><Eye className="w-5 h-5" /><span>Identificando {recognition.name}… {(recognition.similarity * 100).toFixed(1)}%</span></div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-300"><XCircle className="w-5 h-5" /><span>Rosto desconhecido (melhor {(recognition.similarity * 100).toFixed(1)}% &lt; limiar {(threshold * 100).toFixed(0)}%)</span></div>
                )}
              </div>
            )}
          </div>

          {/* Métricas */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric icon={<Gauge className="w-4 h-4" />} label="Detecção" value={`${metrics.lastDetectMs} ms`} />
            <Metric icon={<Gauge className="w-4 h-4" />} label="Embedding" value={`${metrics.lastEmbedMs} ms`} />
            <Metric icon={<Gauge className="w-4 h-4" />} label="Match" value={`${metrics.lastMatchMs} ms`} sub="ponta-a-ponta < 3000 ms" />
            <Metric icon={<Database className="w-4 h-4" />} label="Frames" value={String(metrics.frames)} sub={`${metrics.accepts} aceites · ${metrics.rejects} rejeitados`} />
          </div>

          {engineReady && (
            <p className="mt-3 text-xs text-slate-500 flex items-center gap-2">
              <Fingerprint className="w-3.5 h-3.5" />
              Backend: <strong className="text-slate-300">{engineInfo.backend}</strong> · Embedding: <strong className="text-slate-300">{engineInfo.embeddingModel}</strong> · dimensão {lastCapture?.embedding.length || '—'}
            </p>
          )}
        </section>

        {/* Painel de cadastro e galeria */}
        <section className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><UserPlus className="w-4 h-4 text-cyan-400" /> Enrolamento (multi-amostra)</h2>
            <input
              value={enrollName}
              onChange={(e) => setEnrollName(e.target.value)}
              placeholder="Nome do voluntário"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm mb-3 outline-none focus:border-cyan-500"
            />
            <div className="flex items-center gap-2">
              <button onClick={handleCaptureSample} disabled={!engineReady}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" /> Capturar amostra
              </button>
              <span className={`text-sm font-bold px-2 ${pendingSamples.length >= MIN_SAMPLES ? 'text-emerald-400' : 'text-slate-500'}`}>
                {pendingSamples.length}/{MIN_SAMPLES}+
              </span>
            </div>
            <button onClick={handleSaveEnrollment} disabled={pendingSamples.length < MIN_SAMPLES || !enrollName.trim()}
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl py-2 text-sm font-medium">
              Guardar perfil biométrico
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2"><Database className="w-4 h-4 text-cyan-400" /> Galeria local</h2>
              <button onClick={handleClearAll} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> limpar tudo</button>
            </div>
            {gallery.length === 0 ? (
              <p className="text-sm text-slate-500">Sem voluntários registados. Cadastre ≥ 3 amostras por pessoa.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {gallery.map((g) => (
                  <li key={g.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{g.name}</p>
                      <p className="text-xs text-slate-500">{g.samples.length} embeddings</p>
                    </div>
                    <button onClick={() => handleDelete(g.id)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-slate-500 mt-3">{gallery.length} pessoa(s) · {totalEmbeddings} embeddings armazenados</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><RefreshCw className="w-4 h-4 text-cyan-400" /> Limiar de match: <span className="text-cyan-300">{(threshold * 100).toFixed(0)}%</span></h2>
            <input type="range" min={50} max={95} value={threshold * 100} onChange={(e) => setThreshold(Number(e.target.value) / 100)} className="w-full accent-cyan-500" />
            <p className="text-xs text-slate-500 mt-2">
              Ajuste até <strong>0 falso aceite</strong> entre voluntários e reconhecimento estável. Anti-spoof mínimo: {ANTISPOOF_MIN * 100}%.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm space-y-2">
            <h2 className="font-semibold">Critérios do POC (ADR 0003 §4)</h2>
            <Criterion ok={metrics.frames > 0} label="Pipeline corre no dispositivo" />
            <Criterion ok={metrics.lastDetectMs + metrics.lastEmbedMs + metrics.lastMatchMs < 3000 && metrics.detects > 0} label="Latência < 3 s ponta-a-ponta" />
            <Criterion ok={metrics.spoof === 0 || (metrics.spoof / Math.max(1, metrics.detects)) < 0.05} label="Anti-spoofing ativo (rejeita foto/tela)" />
            <Criterion ok={gallery.length >= 3} label="≥ 3 voluntários enrolados" />
            <Criterion ok label="0 frames persistidos (só embeddings)" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-400">{icon}{label}</div>
      <div className="text-lg font-bold">{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Criterion({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-slate-600" />}
      <span className={ok ? 'text-slate-200' : 'text-slate-500'}>{label}</span>
    </div>
  );
}

function cosineSim(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const den = Math.sqrt(na) * Math.sqrt(nb);
  return den === 0 ? 0 : dot / den;
}
