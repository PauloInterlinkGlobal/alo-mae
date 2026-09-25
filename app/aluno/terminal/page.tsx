'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSystem } from '@/lib/context';
import {
  Student,
  AttendanceEventType,
  AttendanceState,
  AttendanceEventRecord,
  AccessLog,
  TerminalConfig,
} from '@/lib/types';
import { TerminalHeader } from '@/components/terminal/TerminalHeader';
import {
  extractBiometricFromSource,
  matchStudentLocally,
  generateSeedEmbeddingForStudent,
} from '@/lib/biometrics/engine';
import { biometricAudio } from '@/lib/biometrics/audio-speech';
import {
  requestCameraStream, queryCameraPermission, isEmbeddedInIframe,
  captureStillViaInput, loadImageFromDataUrl,
} from '@/lib/biometrics/camera';
import { offlineSyncManager } from '@/lib/biometrics/offline-sync';
import {
  registerAttendanceBiometricEvent,
  registerDeniedAttendanceAttempt,
  evaluateNextAttendanceEvent,
  getAttendanceEventLabel,
} from '@/services/attendance-engine.service';
import {
  ScanFace,
  Fingerprint,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  FileCheck,
  Wifi,
  WifiOff,
  Settings,
  X,
  Clock,
  MapPin,
  Activity,
  Layers,
  Sliders,
  Check,
  Lock,
  ChevronRight,
  ExternalLink,
  RotateCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const DEFAULT_TERMINAL_CONFIG: TerminalConfig = {
  deviceId: 'terminal-01',
  deviceName: 'Terminal #01 — Guarita Principal',
  schoolId: 'school_horizonte_luanda',
  locationName: 'Portão Principal — Bloco A',
  targetClassId: 'all',
  targetClassName: 'Todas as Turmas (Portaria Geral)',
  preferredMode: 'auto',
  offlineEnabled: true,
  matchThreshold: 0.78,
  cooldownSeconds: 15,
};

export default function AlunoTerminalPage() {
  const { students, setSelectedReceiptLog, logs } = useSystem();

  // Terminal Configuration State (stored in localStorage per physical tablet)
  const [config, setConfig] = useState<TerminalConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('alomae_terminal_config');
        if (stored) return { ...DEFAULT_TERMINAL_CONFIG, ...JSON.parse(stored) };
      } catch {}
    }
    return DEFAULT_TERMINAL_CONFIG;
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [camErr, setCamErr] = useState<{ kind: string; message: string } | null>(null);
  const [embedded, setEmbedded] = useState(false);
  const [permState, setPermState] = useState<string>(`prompt`);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Hardware Camera & Stream
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Real-time Facial Tracking
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);
  const [detectedBox, setDetectedBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [livenessStatus, setLivenessStatus] = useState<{ isLive: boolean; score: number; text: string }>({
    isLive: false,
    score: 0,
    text: 'Aguardando aproximação facial...',
  });

  // Successful Recognition State
  const [confirmedStudent, setConfirmedStudent] = useState<{
    student: Student;
    eventType: AttendanceEventType;
    eventLabel: string;
    timestamp: string;
    receiptCode: string;
    similarity: number;
    isOffline: boolean;
    denied?: boolean;
    reasonLabel?: string;
  } | null>(null);

  // Cooldown Protection (prevents repeated rapid scans of the same student)
  const [cooldownStudentId, setCooldownStudentId] = useState<string | null>(null);
  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0);
  const recentScansRef = useRef<Map<string, number>>(new Map()); // studentId -> timestamp ms

  // Local Attendance State Cache for fast on-device evaluation
  const [studentStates, setStudentStates] = useState<Map<string, AttendanceState>>(new Map());

  // Offline Sync State
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // Save config changes to localStorage
  const updateConfig = (newCfg: Partial<TerminalConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newCfg };
      if (typeof window !== 'undefined') {
        localStorage.setItem('alomae_terminal_config', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Distinct classes available from student database
  const availableClasses = useMemo(() => {
    const map = new Map<string, string>();
    map.set('all', 'Todas as Turmas (Portaria Geral)');
    students.forEach((s) => {
      const cid = s.currentClassId || s.classId || s.turma_id;
      const cname = s.className || s.classId;
      if (cid && cname) {
        map.set(cid, cname);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [students]);

  // Scoped student pool for this tablet (optimizes memory on 4GB tablets)
  const activeStudentPool = useMemo(() => {
    if (!config.targetClassId || config.targetClassId === 'all') {
      return students;
    }
    const filtered = students.filter(
      (s) => (s.currentClassId || s.classId || s.turma_id) === config.targetClassId
    );
    return filtered.length > 0 ? filtered : students;
  }, [students, config.targetClassId]);

  // Subscribe to offline sync manager
  useEffect(() => {
    const unsub = offlineSyncManager.subscribe((count, online) => {
      setOfflineQueueCount(count);
      setIsOnline(online);
    });
    return unsub;
  }, []);

  // Sync audio toggles
  useEffect(() => {
    biometricAudio.setVoiceEnabled(voiceEnabled);
    biometricAudio.setSoundEnabled(soundEnabled);
  }, [voiceEnabled, soundEnabled]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownCountdown <= 0) {
      setCooldownStudentId(null);
      return;
    }
    const timer = setTimeout(() => {
      setCooldownCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownCountdown]);

  // Auto-dismiss confirmation banner after 5.5 seconds
  useEffect(() => {
    if (!confirmedStudent) return;
    const timer = setTimeout(() => {
      setConfirmedStudent(null);
    }, 5500);
    return () => clearTimeout(timer);
  }, [confirmedStudent]);

  // A câmara NÃO é pedida automaticamente no arranque: o pedido acontece no
  // clique de "Ativar Câmara" (gesto do utilizador → prompt legítimo; evita a
  // negação automática — e memorizada — em iframes/preview).
  useEffect(() => {
    setEmbedded(isEmbeddedInIframe());
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Alô Mãe] Camera environment', {
        secureContext: window.isSecureContext,
        protocol: window.location.protocol,
        origin: window.location.origin,
        mediaDevices: !!navigator.mediaDevices,
        getUserMedia: !!navigator.mediaDevices?.getUserMedia,
        embedded: isEmbeddedInIframe(),
      });
    }
  }, []);

  // Cleanup ao desmontar — nunca deixar tracks presos
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsWebcamActive(false);
    setDetectedBox(null);
    setLivenessStatus({ isLive: false, score: 0, text: 'Câmara desativada' });
  }, []);

  const activateCamera = useCallback(async () => {
    setCamErr(null);
    setCameraError(null);

    // Sem múltiplos MediaStreams: para o stream anterior antes de novo pedido
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;

    const res = await requestCameraStream();
    if (res.stream && videoRef.current) {
      cameraStreamRef.current = res.stream;
      videoRef.current.srcObject = res.stream;
      try { await videoRef.current.play(); } catch { /* autoplay policy */ }
      setIsWebcamActive(true);
    } else {
      if (res.stream) res.stream.getTracks().forEach((t) => t.stop());
      console.error('[Alô Mãe] Camera error', { name: res.errorName, message: res.message });
      setCamErr({ kind: res.errorKind || 'unknown', message: res.message });
      setCameraError(res.message);
      setIsWebcamActive(false);
    }
    setPermState(await queryCameraPermission());
  }, []);

  // Fullscreen toggle for Kiosk mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Autonomous Biometric Recognition Execution
  const processRecognizedStudent = useCallback(
    async (student: Student, similarity: number) => {
      const studentId = student.id;
      const now = Date.now();
      const lastScan = recentScansRef.current.get(studentId) || 0;
      const cooldownMs = (config.cooldownSeconds || 15) * 1000;

      // Cooldown guard to prevent multiple rapid scans
      if (now - lastScan < cooldownMs) {
        setCooldownStudentId(studentId);
        setCooldownCountdown(Math.ceil((cooldownMs - (now - lastScan)) / 1000));
        biometricAudio.playWarningBeep();
        return;
      }

      recentScansRef.current.set(studentId, now);
      setCooldownStudentId(studentId);
      setCooldownCountdown(config.cooldownSeconds || 15);

      // Determine current attendance state
      const curState = studentStates.get(studentId) || 'AUSENTE';
      const eventType = evaluateNextAttendanceEvent(curState, config.preferredMode, config.attendanceSchedule, config.reentryPolicy || 'block');
      const eventLabel = getAttendanceEventLabel(eventType);

      const timeNow = new Date();
      const timeStr = timeNow.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const receiptCode = `REC-${timeNow.getFullYear()}${(timeNow.getMonth() + 1).toString().padStart(2, '0')}${timeNow.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      // REGRA (auditoria §5): nova entrada após SAÍDA OFICIAL é bloqueada.
      // Regista a tentativa (online direto / offline na fila) e informa o aluno.
      if (eventType === 'ACESSO_REJEITADO') {
        biometricAudio.playWarningBeep();
        setConfirmedStudent({
          student,
          eventType,
          eventLabel,
          timestamp: timeStr,
          receiptCode,
          similarity,
          isOffline: !navigator.onLine,
          denied: true,
          reasonLabel: 'Este aluno já realizou a saída oficial hoje.',
        });

        if (navigator.onLine) {
          registerDeniedAttendanceAttempt({
            studentId,
            reasonCode: 'REENTRY_AFTER_OFFICIAL_EXIT',
            deviceId: config.deviceId,
            method: 'FACIAL',
            confidence: similarity,
            location: config.locationName,
          }).catch((err) => {
            console.warn('Falha ao registar tentativa negada, enfileirando:', err);
            offlineSyncManager.enqueue(studentId, 'ACESSO_REJEITADO', 'facial', config.locationName, config.deviceId, similarity, 'REENTRY_AFTER_OFFICIAL_EXIT');
          });
        } else {
          offlineSyncManager.enqueue(studentId, 'ACESSO_REJEITADO', 'facial', config.locationName, config.deviceId, similarity, 'REENTRY_AFTER_OFFICIAL_EXIT');
        }
        return;
      }

      // Audio feedback & Voice synthesis
      biometricAudio.playSuccessChime();
      biometricAudio.speakAttendanceConfirmation(student.name, eventType);

      // Confetti celebration
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00D1FF', '#10B981', '#3B82F6', '#F59E0B'],
        });
      } catch {}

      // Update local state machine cache immediately
      let nextState: AttendanceState = 'PRESENTE';
      if (eventType === 'SAIDA_TEMPORARIA') nextState = 'FORA_TEMPORARIAMENTE';
      else if (eventType === 'SAIDA_OFICIAL') nextState = 'SAIU_OFICIALMENTE';
      setStudentStates((prev) => new Map(prev).set(studentId, nextState));

      // Trigger UI Confirmation Banner
      setConfirmedStudent({
        student,
        eventType,
        eventLabel,
        timestamp: timeStr,
        receiptCode,
        similarity,
        isOffline: !navigator.onLine,
      });

      // Persist to Firestore or local offline queue
      if (navigator.onLine) {
        try {
          await registerAttendanceBiometricEvent({
            studentId,
            eventType,
            method: 'FACIAL',
            location: config.locationName,
            deviceId: config.deviceId,
            confidence: similarity,
            livenessPassed: true,
          });
        } catch (err) {
          console.warn('Erro ao sincronizar com Firestore, enfileirando offline:', err);
          offlineSyncManager.enqueue(studentId, eventType, 'facial', config.locationName);
        }
      } else {
        offlineSyncManager.enqueue(studentId, eventType, 'facial', config.locationName);
      }
    },
    [config, studentStates]
  );

  // FALLBACK NÍVEL 2 — foto pela câmara nativa do celular (funciona em iframe)
  const handleNativeCameraCapture = useCallback(async () => {
    try {
      const shot = await captureStillViaInput();
      if (!shot) return; // utilizador cancelou

      const img = await loadImageFromDataUrl(shot.dataUrl);
      const result = await extractBiometricFromSource(img);

      if (!result || result.qualityScore < 45) {
        setCameraError('Nenhum rosto utilizável na foto capturada. Aproxime-se e tente de novo.');
        setCamErr({ kind: 'unknown', message: 'Nenhum rosto utilizável na foto capturada.' });
        return;
      }

      const match = matchStudentLocally(result.embedding, activeStudentPool, {
        threshold: config.matchThreshold || 0.78,
        classIdFilter: config.targetClassId,
      });

      if (match && match.isMatch) {
        const matchedStudent = activeStudentPool.find((s) => s.id === match.studentId);
        if (matchedStudent) {
          await processRecognizedStudent(matchedStudent, match.similarity);
        }
      } else {
        setCamErr({ kind: 'unknown', message: 'Rosto não reconhecido entre os alunos desta turma.' });
        setCameraError('Rosto não reconhecido entre os alunos desta turma.');
      }
    } catch (e: any) {
      setCamErr({ kind: 'unknown', message: e?.message || 'Falha ao processar a foto.' });
    }
  }, [activeStudentPool, config, processRecognizedStudent]);

  // Real-time Camera Frame Processing Loop (Hands-Free Facial Recognition)
  useEffect(() => {
    if (!isWebcamActive) return;

    let isMounted = true;
    let loopTimeout: NodeJS.Timeout;

    const runRecognitionLoop = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || isProcessingFrame) {
        if (isMounted) loopTimeout = setTimeout(runRecognitionLoop, 200);
        return;
      }

      // CORREÇÃO D2: pool vazio → reconhecimento desativado (nunca expandir escopo)
      if (activeStudentPool.length === 0) {
        setDetectedBox(null);
        setLivenessStatus({
          isLive: false,
          score: 0,
          text: 'Nenhum aluno carregado para esta turma — verifique a configuração do terminal.',
        });
        if (isMounted) loopTimeout = setTimeout(runRecognitionLoop, 500);
        return;
      }

      try {
        setIsProcessingFrame(true);
        const result = await extractBiometricFromSource(videoRef.current);

        if (!isMounted) return;

        if (result && result.qualityScore >= 45) {
          setDetectedBox(result.box);
          setLivenessStatus({
            isLive: result.liveness.isLive,
            score: result.liveness.score,
            text: result.liveness.isLive
              ? 'Rosto Detectado • Vivacidade Confirmada'
              : 'Verificando vivacidade facial...',
          });

          // Perform local 1:N matching against this tablet's active student pool
          const match = matchStudentLocally(result.embedding, activeStudentPool, {
            threshold: config.matchThreshold || 0.78,
            classIdFilter: config.targetClassId,
          });

          if (match && match.isMatch && result.liveness.isLive) {
            const matchedStudent = activeStudentPool.find((s) => s.id === match.studentId);
            if (matchedStudent) {
              await processRecognizedStudent(matchedStudent, match.similarity);
            }
          }
        } else {
          setDetectedBox(null);
          setLivenessStatus({
            isLive: false,
            score: 0.3,
            text: 'Olhe para a câmara do totem...',
          });
        }
      } catch (e) {
        // Frame analysis error handled gracefully
      } finally {
        if (isMounted) {
          setIsProcessingFrame(false);
          // Run next frame after 220ms (smooth ~4.5 FPS, very gentle on tablet CPU and battery)
          loopTimeout = setTimeout(runRecognitionLoop, 220);
        }
      }
    };

    loopTimeout = setTimeout(runRecognitionLoop, 500);

    return () => {
      isMounted = false;
      clearTimeout(loopTimeout);
    };
  }, [isWebcamActive, isProcessingFrame, activeStudentPool, config, processRecognizedStudent]);

  // Color & Badge for Event Types
  const getEventBadgeStyles = (type: AttendanceEventType) => {
    switch (type) {
      case 'ENTRADA':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'SAIDA_TEMPORARIA':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'RETORNO':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'SAIDA_OFICIAL':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'ACESSO_REJEITADO':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  return (
    <div className="min-h-screen bg-[#060B18] text-white flex flex-col font-['Inter',sans-serif] select-none overflow-x-hidden">
      {/* Kiosk Device Header */}
      <TerminalHeader />

      {/* Autonomous Kiosk Control Strip */}
      <div className="bg-[#091224] border-b border-blue-900/40 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Terminal Identity & Turma Scope */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-white tracking-wide uppercase">
                {config.deviceName}
              </span>
            </div>
            <span className="text-slate-400">•</span>
            <span className="text-cyan-300 font-mono text-[11px] bg-blue-950/80 px-2 py-0.5 rounded border border-blue-600/30">
              {config.targetClassName || 'Portaria Geral'} ({activeStudentPool.length} alunos)
            </span>
          </div>

          {/* Operation Mode Selector */}
          <div className="flex items-center gap-1.5 bg-[#050B16] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => updateConfig({ preferredMode: 'auto' })}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                config.preferredMode === 'auto'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="O motor de presença decide automaticamente o evento (Entrada / Saída / Retorno)"
            >
              Automático (Motor de Estados)
            </button>
            <button
              onClick={() => updateConfig({ preferredMode: 'ENTRADA' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                config.preferredMode === 'ENTRADA'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Só Entrada
            </button>
            <button
              onClick={() => updateConfig({ preferredMode: 'SAIDA_TEMPORARIA' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                config.preferredMode === 'SAIDA_TEMPORARIA'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Saída Temp.
            </button>
            <button
              onClick={() => updateConfig({ preferredMode: 'RETORNO' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                config.preferredMode === 'RETORNO'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Retorno
            </button>
            <button
              onClick={() => updateConfig({ preferredMode: 'SAIDA_OFICIAL' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                config.preferredMode === 'SAIDA_OFICIAL'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Saída Oficial
            </button>
          </div>

          {/* Quick Controls: Audio, Offline Sync & Settings */}
          <div className="flex items-center gap-2.5">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                setSoundEnabled(!voiceEnabled);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                voiceEnabled
                  ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
              title="Voz em Português e Sons"
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{voiceEnabled ? 'Voz Ativa' : 'Mudo'}</span>
            </button>

            {/* Offline Sync Status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                isOnline
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>
                {isOnline
                  ? offlineQueueCount > 0
                    ? `${offlineQueueCount} pendentes`
                    : 'Online'
                  : `Offline (${offlineQueueCount})`}
              </span>
              {offlineQueueCount > 0 && isOnline && (
                <button
                  onClick={async () => {
                    setIsSyncingOffline(true);
                    await offlineSyncManager.flushQueue();
                    setIsSyncingOffline(false);
                  }}
                  disabled={isSyncingOffline}
                  className="ml-1 text-[10px] underline hover:text-white"
                >
                  {isSyncingOffline ? '...' : 'Sincronizar'}
                </button>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10"
              title="Ecrã Completo (Totem Kiosk)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Settings Dialog Trigger */}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10"
              title="Configurações do Totem"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Configurar Totem</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Kiosk Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full relative">
        {/* Anti-duplication Cooldown Banner */}
        {cooldownStudentId && (
          <div className="w-full max-w-lg mb-4 bg-blue-950/80 border border-cyan-500/40 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-cyan-200 shadow-xl animate-fade-in">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Anti-Duplicação Ativo: Aluno registado recentemente</span>
            </div>
            <span className="font-mono font-bold bg-cyan-900/60 px-2 py-0.5 rounded text-cyan-300">
              {cooldownCountdown}s
            </span>
          </div>
        )}

        {/* Central Camera HUD with Autonomous Facial Tracking */}
        <div className="relative w-full max-w-md flex flex-col items-center">
          {isWebcamActive && (
            <button
              onClick={stopCamera}
              className="absolute -top-5 right-0 z-10 text-[10px] uppercase tracking-wider text-slate-400 hover:text-white bg-[#091224]/90 border border-white/10 rounded-full px-2.5 py-1"
            >
              Desativar Câmara
            </button>
          )}

          {/* Circular/Rounded HUD Frame */}
          <div className="relative w-76 h-76 sm:w-88 sm:h-88 rounded-full flex items-center justify-center p-3.5 bg-gradient-to-b from-[#143A7B]/40 via-cyan-950/20 to-transparent border-2 border-dashed border-cyan-400/40 shadow-[0_0_80px_rgba(0,209,255,0.22)]">
            {/* Outer Rotating Scan Ring */}
            <div
              className={`absolute inset-0 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-emerald-500 border-l-transparent ${
                isWebcamActive ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '4s' }}
            />

            {/* Inner Viewport Container */}
            <div className="relative w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center border-4 border-[#0B1733] shadow-inner">
              {isWebcamActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="relative w-full h-full bg-[#050C1F] flex flex-col items-center justify-center text-center p-6">
                  <div className="w-20 h-20 rounded-full bg-blue-900/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-3 animate-pulse">
                    <ScanFace className="w-10 h-10" />
                  </div>
                  <p className="text-sm font-bold text-white">Câmara Desativada</p>
                  <button
                    onClick={activateCamera}
                    className="mt-3 px-4 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg active:scale-95 cursor-pointer"
                  >
                    Ativar Câmara
                  </button>
                </div>
              )}

              {/* Real-time Facial Bounding Box Overlay */}
              {detectedBox && isWebcamActive && (
                <div
                  className="absolute border-2 border-cyan-400 rounded-2xl pointer-events-none transition-all duration-100 shadow-[0_0_20px_rgba(0,209,255,0.8)]"
                  style={{
                    left: `${detectedBox.x * 100}%`,
                    top: `${detectedBox.y * 100}%`,
                    width: `${detectedBox.width * 100}%`,
                    height: `${detectedBox.height * 100}%`,
                  }}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md">
                    Rosto Detectado
                  </span>
                </div>
              )}

              {/* Target Hologram Marks */}
              <div className="absolute inset-6 rounded-full border border-cyan-400/30 pointer-events-none" />
              <div className="absolute top-1/2 left-6 right-6 h-px bg-cyan-400/25 pointer-events-none" />
              <div className="absolute left-1/2 top-6 bottom-6 w-px bg-cyan-400/25 pointer-events-none" />

              {/* Active Laser Scan Line */}
              {isWebcamActive && <div className="scanner-laser" />}
            </div>

            {/* Bottom Status Pill */}
            <div className="absolute -bottom-3 bg-[#0A142D] border border-cyan-400/60 text-cyan-300 px-4 py-1.5 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2">
              <ScanFace className="w-4 h-4 text-cyan-400" />
              <span>{livenessStatus.text}</span>
            </div>
          </div>

          {/* Primary Instructions Under Camera */}
          <div className="mt-7 text-center">
            <h2 className="text-xl sm:text-2xl font-bold font-['Poppins',sans-serif] text-white tracking-wide">
              Olhe para a câmara
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1.5 text-xs text-cyan-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Reconhecimento facial automático e sem toque ativo</span>
            </div>
          </div>

          {camErr && (
            <div className="text-xs mt-3 text-center bg-red-950/70 px-4 py-3 rounded-xl border border-red-500/30 max-w-md space-y-2">
              <p className="text-red-300 font-medium">{camErr.message}</p>

              {camErr.kind === 'denied' && embedded && (
                <>
                  <p className="text-red-200/70">
                    Esta página está embutida num <strong>iframe</strong> — o navegador nega a câmara
                    automaticamente neste cenário, sem mostrar o pedido de permissão.
                  </p>
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-3 py-1.5 font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir terminal em novo separador (recomendado)
                  </a>
                  <p className="text-red-200/50">Alternativa: ícone 🎥 na barra de endereço → autorizar câmara.</p>
                </>
              )}

              {camErr.kind === 'denied' && !embedded && (
                <p className="text-red-200/70">
                  Clique no ícone 🎥 da barra de endereço → <strong>Permitir</strong> → e toque em «Tentar novamente».
                </p>
              )}

              {camErr.kind === 'in-use' && (
                <p className="text-red-200/70">Feche a outra aplicação que está a usar a câmara e tente de novo.</p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={activateCamera}
                  className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3 py-1.5 font-medium"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Tentar novamente
                </button>
                <button
                  onClick={handleNativeCameraCapture}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 font-medium"
                >
                  <Camera className="w-3.5 h-3.5" /> Usar câmara do celular (foto)
                </button>
              </div>
              <p className="text-[10px] text-red-200/50">
                Sem câmara? Coloque o dedo no <strong>Sensor Biométrico Digital</strong> abaixo — no app Android a biometria nativa do dispositivo autentica o operador.
              </p>

              <p className="text-[10px] text-red-200/40">
                permissão: {permState}{embedded ? ' · iframe' : ''}
              </p>
            </div>
          )}

          {/* Biometric Fingerprint Sensor Slot Divider */}
          <div className="w-full max-w-sm mt-8">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">
                ou coloque o dedo no sensor
              </span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            {/* Hardware Sensor Box */}
            <div className="mt-2 bg-[#0C1733]/70 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-4 flex items-center justify-between transition-all group shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shadow-inner">
                  <Fingerprint className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-white">Sensor Biométrico Digital</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Leitor USB / Bluetooth externo pronto
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                STANDBY
              </span>
            </div>
          </div>
        </div>

        {/* RECOGNITION CONFIRMED MODAL / OVERLAY CARD (Appears only after identification) */}
        {confirmedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`bg-gradient-to-br from-[#0D1D3F] via-[#0A1633] to-[#070E22] border-2 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden animate-scale-up ${confirmedStudent.denied ? 'border-rose-500 shadow-[0_0_70px_rgba(244,63,94,0.30)]' : 'border-emerald-500 shadow-[0_0_70px_rgba(16,185,129,0.35)]'}`}>
              {/* Top Accent Ribbon */}
              <div className={`absolute top-0 inset-x-0 h-1.5 ${confirmedStudent.denied ? 'bg-gradient-to-r from-rose-500 via-red-400 to-orange-500' : 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500'}`} />

              {/* Close Button */}
              <button
                onClick={() => setConfirmedStudent(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Result Icon */}
              <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mx-auto mb-4 ${confirmedStudent.denied ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-lg shadow-rose-500/20' : 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20'}`}>
                {confirmedStudent.denied ? <AlertTriangle className="w-9 h-9" /> : <CheckCircle2 className="w-9 h-9" />}
              </div>

              {/* Main Headline */}
              <span className={`text-xs font-bold uppercase tracking-widest block mb-1 ${confirmedStudent.denied ? 'text-rose-400' : 'text-emerald-400'}`}>
                {confirmedStudent.denied ? '✕ Acesso Não Autorizado' : '✓ Reconhecimento Confirmado'}
              </span>

              {/* Student Photo & Identity */}
              <div className="my-4 flex flex-col items-center">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-xl mb-3">
                  <img
                    src={confirmedStudent.student.photoUrl}
                    alt={confirmedStudent.student.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className="font-['Poppins',sans-serif] font-bold text-xl text-white">
                  {confirmedStudent.student.name}
                </h3>
                <p className="text-xs text-cyan-300 mt-0.5">
                  {confirmedStudent.student.className} • Matrícula {confirmedStudent.student.matricula}
                </p>
              </div>

              {/* Event Details Card */}
              <div className="bg-[#050C1F]/80 border border-white/10 rounded-2xl p-4 my-4 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Evento de Presença:</span>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full border text-[11px] ${getEventBadgeStyles(
                      confirmedStudent.eventType
                    )}`}
                  >
                    {confirmedStudent.eventLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Horário Oficial:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {confirmedStudent.timestamp}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Método de Validação:</span>
                  <span className="text-cyan-300 font-medium">Reconhecimento Facial On-Device</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-slate-400">Comprovativo Digital:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {confirmedStudent.receiptCode}
                  </span>
                </div>
              </div>

              {/* Notification / Audit Guarantee */}
              {confirmedStudent.denied ? (
                <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2 text-center text-xs text-rose-200">
                  <p className="font-medium">{confirmedStudent.reasonLabel}</p>
                  <p className="text-[10px] text-rose-300/80 mt-0.5">
                    Tentativa registada para auditoria da instituição.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-3 py-2 text-center text-xs text-emerald-200">
                  <p className="font-medium">
                    Encarregado notificado instantaneamente via Alô Mãe
                  </p>
                  {confirmedStudent.isOffline && (
                    <p className="text-[10px] text-amber-300 mt-0.5">
                      ✓ Registado em cache local offline (Sincroniza ao reconectar)
                    </p>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => setConfirmedStudent(null)}
                className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer"
              >
                Próximo Aluno
              </button>
            </div>
          </div>
        )}

        {/* Recent Passages Ticker at Bottom */}
        <div className="w-full max-w-2xl mt-8 bg-[#091224]/80 border border-white/5 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Últimas Passagens Registadas no Totem</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Hoje</span>
          </div>

          <div className="space-y-2">
            {logs.slice(0, 3).map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between bg-[#050C1F] px-3.5 py-2.5 rounded-xl text-xs border border-white/5"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      l.type === 'entry' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-semibold text-white truncate">{l.studentName}</span>
                  <span className="text-[11px] text-slate-400 truncate">({l.className})</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-cyan-300">{l.timestamp}</span>
                  <button
                    onClick={() => setSelectedReceiptLog(l)}
                    className="text-[11px] text-slate-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Comprovativo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* TERMINAL CONFIGURATION MODAL / DRAWER (Admin/Operator Only) */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0D1B3D] border border-blue-600/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl text-left">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/30 text-cyan-300">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Configuração do Terminal</h3>
                  <p className="text-xs text-slate-400">
                    Definições de hardware e escopo da sala para este tablet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Device ID & Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Identificador / Nome do Totem:
                </label>
                <input
                  type="text"
                  value={config.deviceName}
                  onChange={(e) => updateConfig({ deviceName: e.target.value })}
                  className="w-full bg-[#050C1F] border border-blue-500/30 rounded-xl px-3.5 py-2 text-white font-medium focus:ring-2 focus:ring-cyan-400"
                  placeholder="Ex: Terminal #01 — Portão Principal"
                />
              </div>

              {/* Localização Física */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Localização da Instalação:
                </label>
                <input
                  type="text"
                  value={config.locationName}
                  onChange={(e) => updateConfig({ locationName: e.target.value })}
                  className="w-full bg-[#050C1F] border border-blue-500/30 rounded-xl px-3.5 py-2 text-white font-medium focus:ring-2 focus:ring-cyan-400"
                  placeholder="Ex: Portão Principal — Bloco A"
                />
              </div>

              {/* Target Class Scope (crucial for 4GB RAM tablets caching 25-30 students per room) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Turma Alocada a este Totem:</span>
                  <span className="text-[10px] text-cyan-400 font-normal">
                    Otimização de memória (4GB RAM)
                  </span>
                </label>
                <select
                  value={config.targetClassId}
                  onChange={(e) => {
                    const selected = availableClasses.find((c) => c.id === e.target.value);
                    updateConfig({
                      targetClassId: e.target.value,
                      targetClassName: selected ? selected.name : 'Geral',
                    });
                  }}
                  className="w-full bg-[#050C1F] border border-blue-500/30 rounded-xl px-3.5 py-2 text-white font-medium focus:ring-2 focus:ring-cyan-400"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ao selecionar uma turma específica, o tablet baixa apenas os 25–30 alunos dessa
                  sala, acelerando o reconhecimento offline e poupando bateria.
                </p>
              </div>

              {/* Similarity Threshold Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    Threshold de Similaridade Facial:
                  </label>
                  <span className="font-mono font-bold text-cyan-300">
                    {Math.round((config.matchThreshold || 0.78) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.70"
                  max="0.95"
                  step="0.01"
                  value={config.matchThreshold || 0.78}
                  onChange={(e) => updateConfig({ matchThreshold: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>Mais tolerante (70%)</span>
                  <span>Equilibrado (78%)</span>
                  <span>Ultra estrito (95%)</span>
                </div>
              </div>

              {/* Anti-Duplication Cooldown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    Tempo de Cooldown Anti-Duplicação:
                  </label>
                  <span className="font-mono font-bold text-cyan-300">
                    {config.cooldownSeconds || 15} segundos
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="5"
                  value={config.cooldownSeconds || 15}
                  onChange={(e) => updateConfig({ cooldownSeconds: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Impede que um aluno em frente ao tablet seja registrado repetidamente.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end gap-2.5">
              <button
                onClick={() => setIsConfigOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer"
              >
                Concluir & Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
