'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSystem } from '@/lib/context';
import { AccessLog } from '@/lib/types';
import {
  calculateCosineSimilarity,
  generateSeedEmbeddingForStudent,
} from '@/lib/biometrics/engine';
import { biometricAudio } from '@/lib/biometrics/audio-speech';
import { offlineSyncManager } from '@/lib/biometrics/offline-sync';
import {
  ScanFace,
  Fingerprint,
  Camera,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  Cpu,
  Binary,
  Volume2,
  VolumeX,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AdminTerminalSimuladoPage() {
  const { students, registerBiometricAccess, setSelectedReceiptLog } = useSystem();

  const [accessType, setAccessType] = useState<'entry' | 'exit'>('entry');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || 'std-1');
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastLog, setLastLog] = useState<AccessLog | null>(null);

  // Biometric Vector Inspector State
  const [threshold, setThreshold] = useState<number>(0.8);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showVectorRaw, setShowVectorRaw] = useState(false);
  const [simulatedSimilarity, setSimulatedSimilarity] = useState<number>(0.96);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  const profile = currentStudent?.biometricProfile || generateSeedEmbeddingForStudent(currentStudent?.matricula || '2026-00192');

  useEffect(() => {
    biometricAudio.setVoiceEnabled(voiceEnabled);
  }, [voiceEnabled]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isWebcamActive && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {
          setIsWebcamActive(false);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isWebcamActive]);

  const handleSimulate = () => {
    setIsScanning(true);
    const score = 0.93 + Math.random() * 0.06;
    setSimulatedSimilarity(score);

    setTimeout(async () => {
      setIsScanning(false);
      biometricAudio.playSuccessChime();
      biometricAudio.speakAttendanceConfirmation(currentStudent.name, accessType);

      const log = await registerBiometricAccess(
        currentStudent.id,
        accessType,
        'facial',
        'Terminal Portaria Principal'
      );
      setLastLog(log);

      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {
        // fallback
      }
    }, 550);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl text-[#0D1B3D]">
            Laboratório do Motor Biométrico On-Device
          </h1>
          <p className="text-sm text-slate-500">
            Ambiente técnico para inspeção de vetores de 128 dimensões, tolerâncias de similaridade e testes sem toque
          </p>
        </div>

        <Link
          href="/aluno/terminal"
          target="_blank"
          className="inline-flex items-center gap-2 bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <ExternalLink className="w-4 h-4 text-cyan-300" />
          <span>Abrir Kiosk Totem Real (Portaria)</span>
        </Link>
      </div>

      {/* Main Simulation Container */}
      <div className="bg-[#070D1E] rounded-3xl p-6 sm:p-8 text-white border border-blue-900/40 shadow-2xl relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Scanner Visualizer */}
          <div className="flex flex-col items-center">
            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2 bg-[#101F42] p-1 rounded-2xl border border-white/10 mb-6 w-full max-w-sm">
              <button
                onClick={() => setAccessType('entry')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  accessType === 'entry'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Simular Entrada
              </button>
              <button
                onClick={() => setAccessType('exit')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  accessType === 'exit'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Simular Saída
              </button>
            </div>

            {/* Scan Circle HUD */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full flex items-center justify-center p-2.5 bg-gradient-to-b from-[#143A7B]/40 via-cyan-950/20 to-transparent border-2 border-dashed border-cyan-400/40 shadow-[0_0_40px_rgba(6,182,212,0.25)]">
              <div className="relative w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center border-4 border-[#0D1B3D]">
                {isWebcamActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <img
                      src={currentStudent.photoUrl}
                      alt={currentStudent.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-blue-950/20" />
                  </div>
                )}

                {/* Laser animation */}
                <div className="scanner-laser" />

                {/* Target overlay */}
                <div className="absolute inset-4 rounded-full border border-cyan-400/50 pointer-events-none" />
                <div className="absolute top-1/2 left-4 right-4 h-px bg-cyan-400/30 pointer-events-none" />
                <div className="absolute left-1/2 top-4 bottom-4 w-px bg-cyan-400/30 pointer-events-none" />
              </div>

              {/* Status pill */}
              <div className="absolute -bottom-3 bg-[#0A142D] border border-cyan-400/50 text-cyan-300 px-3.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-lg">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Vetor 128-d Normalizado</span>
              </div>
            </div>

            {/* Camera Switcher & Audio Controls */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsWebcamActive(!isWebcamActive)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isWebcamActive ? 'Desativar WebCam' : 'Ativar WebCam do Computador'}</span>
              </button>

              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  voiceEnabled
                    ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{voiceEnabled ? 'Voz Ativa' : 'Mudo'}</span>
              </button>
            </div>

            {/* Biometric Privacy Card */}
            <div className="mt-4 bg-[#0A142D] border border-emerald-500/30 rounded-2xl p-3 text-left w-full max-w-sm">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Conformidade com Proteção de Menores</span>
              </div>
              <p className="text-[11px] text-slate-300">
                A fotografia não é usada como identificador no banco. O reconhecimento ocorre via comparação de cosseno
                do descritor matemático de 128 pontos no próprio dispositivo.
              </p>
            </div>
          </div>

          {/* Right Column: Controls & Demonstration Actions */}
          <div className="space-y-4">
            {/* Student Picker */}
            <div className="bg-[#101F42] border border-white/10 rounded-2xl p-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Aluno Selecionado para Inferência Facial:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setLastLog(null);
                }}
                className="w-full bg-[#070D1E] border border-blue-500/30 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {students.map((std) => (
                  <option key={std.id} value={std.id} className="bg-[#070D1E] text-white">
                    {std.name} — {std.className} (Mat: {std.matricula})
                  </option>
                ))}
              </select>
            </div>

            {/* Student Profile Card with Biometric Metadata */}
            <div className="bg-[#101F42]/80 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-xl overflow-hidden border border-white/20 shrink-0">
                  <img
                    src={currentStudent.photoUrl}
                    alt={currentStudent.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="font-bold text-sm text-white truncate">{currentStudent.name}</p>
                  <p className="text-xs text-blue-300 truncate">
                    {currentStudent.className} • Matrícula {currentStudent.matricula}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                    Hash Biométrico: {profile.featureHash}
                  </p>
                </div>
              </div>

              {/* Vector Parameters & Telemetry */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#070D1E] p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Algoritmo</span>
                  <span className="font-mono font-bold text-cyan-300 text-[11px]">{profile.algorithm}</span>
                </div>
                <div className="bg-[#070D1E] p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Dimensões</span>
                  <span className="font-mono font-bold text-cyan-300 text-[11px]">128 floats</span>
                </div>
                <div className="bg-[#070D1E] p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block">Qualidade</span>
                  <span className="font-mono font-bold text-emerald-400 text-[11px]">{profile.qualityScore}%</span>
                </div>
              </div>

              {/* Threshold Slider */}
              <div className="bg-[#070D1E] p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Limiar Mínimo de Similaridade:</span>
                  <span className="font-mono font-bold text-cyan-400">{Math.round(threshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="0.95"
                  step="0.01"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Toggle Vector Raw Values */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowVectorRaw(!showVectorRaw)}
                  className="text-[11px] text-cyan-300 hover:text-white flex items-center gap-1.5"
                >
                  <Binary className="w-3.5 h-3.5" />
                  <span>{showVectorRaw ? 'Ocultar vetor matemático' : 'Inspecionar vetor de 128 floats'}</span>
                </button>

                {showVectorRaw && (
                  <div className="mt-2 p-2.5 bg-[#050C1F] rounded-xl border border-blue-900/60 font-mono text-[9px] text-slate-400 max-h-24 overflow-y-auto custom-scrollbar">
                    [{profile.embedding.map((val) => val.toFixed(4)).join(', ')}]
                  </div>
                )}
              </div>
            </div>

            {/* Test Trigger Button */}
            <button
              onClick={handleSimulate}
              disabled={isScanning}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-['Poppins',sans-serif] font-bold text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              {isScanning ? (
                <span>Extraindo descritor & calculando Cosseno...</span>
              ) : (
                <>
                  <ScanFace className="w-5 h-5" />
                  <span>
                    Disparar Reconhecimento Sem Toque ({accessType === 'entry' ? 'Entrada' : 'Saída'})
                  </span>
                </>
              )}
            </button>

            {/* Success result */}
            {lastLog && (
              <div className="p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-xs text-emerald-100 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Similaridade de Cosseno: {Math.round(simulatedSimilarity * 100)}% (Aprovado)</span>
                  </span>
                  <span className="font-mono text-emerald-300">{lastLog.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Notificação Push despachada para {currentStudent.parentName} ({currentStudent.parentPhone}).
                </p>
                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedReceiptLog(lastLog)}
                    className="text-cyan-300 hover:underline font-semibold text-xs cursor-pointer"
                  >
                    Ver Comprovativo Oficial
                  </button>
                  <Link
                    href="/pai/inicio"
                    className="text-white hover:underline text-xs flex items-center gap-1 font-semibold"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-300" />
                    <span>Ver no App do Pai</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
