'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSystem } from '@/lib/context';
import { AccessLog } from '@/lib/types';
import { TerminalHeader } from '@/components/terminal/TerminalHeader';
import {
  ScanFace,
  Fingerprint,
  Camera,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Volume2,
  FileCheck,
  Wifi,
  Database,
  User,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AlunoTerminalPage() {
  const {
    students,
    registerBiometricAccess,
    setSelectedReceiptLog,
  } = useSystem();

  const [accessType, setAccessType] = useState<'entry' | 'exit'>('entry');
  const [authMethod, setAuthMethod] = useState<'facial' | 'fingerprint'>('facial');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0].id);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastConfirmedLog, setLastConfirmedLog] = useState<AccessLog | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  // Handle real webcam feed
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isWebcamActive && typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch(() => {
          setIsWebcamActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isWebcamActive]);

  const handleValidateScan = () => {
    setIsScanning(true);

    setTimeout(async () => {
      setIsScanning(false);
      const log = await registerBiometricAccess(currentStudent.id, accessType, authMethod);
      setLastConfirmedLog(log);
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch {
        // fallback
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-white flex flex-col font-['Inter',sans-serif] select-none">
      {/* Kiosk Device Header */}
      <TerminalHeader />

      {/* Main Terminal Screen Content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-4 sm:p-6 lg:p-8 gap-8 max-w-6xl mx-auto w-full">
        {/* Left Side: Scanner Viewport */}
        <div className="w-full max-w-lg flex flex-col items-center">
          {/* Mode Switchers: Entrada / Saída */}
          <div className="w-full grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => {
                setAccessType('entry');
                setLastConfirmedLog(null);
              }}
              className={`py-3.5 px-4 rounded-2xl font-['Poppins',sans-serif] font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 ${
                accessType === 'entry'
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/30'
                  : 'bg-[#101F42] text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>REGISTAR ENTRADA</span>
            </button>

            <button
              onClick={() => {
                setAccessType('exit');
                setLastConfirmedLog(null);
              }}
              className={`py-3.5 px-4 rounded-2xl font-['Poppins',sans-serif] font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 ${
                accessType === 'exit'
                  ? 'bg-amber-600 text-white ring-4 ring-amber-500/30'
                  : 'bg-[#101F42] text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span>REGISTAR SAÍDA</span>
            </button>
          </div>

          {/* Scanner Circle / Camera HUD */}
          <div className="relative w-72 h-72 sm:w-84 sm:h-84 rounded-full flex items-center justify-center p-3 bg-gradient-to-b from-[#143A7B]/40 to-transparent border-2 border-dashed border-blue-400/40 shadow-[0_0_50px_rgba(20,58,123,0.4)]">
            {/* Outer Rotating Ring */}
            <div
              className={`absolute inset-0 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-blue-600 border-l-transparent ${
                isScanning ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '3s' }}
            />

            {/* Inner Viewport */}
            <div className="relative w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center border-4 border-[#0D1B3D]">
              {authMethod === 'facial' ? (
                isWebcamActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="relative w-full h-full">
                    {/* Simulated Camera Feed */}
                    <img
                      src={currentStudent.photoUrl}
                      alt={currentStudent.name}
                      className="w-full h-full object-cover filter contrast-105"
                    />
                    <div className="absolute inset-0 bg-blue-950/20 backdrop-brightness-95" />
                  </div>
                )
              ) : (
                /* Fingerprint HUD */
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-28 h-28 rounded-full bg-blue-900/30 border border-blue-400/30 flex items-center justify-center text-cyan-400 animate-pulse">
                    <Fingerprint className="w-16 h-16 stroke-[1.5]" />
                  </div>
                  <p className="text-xs text-blue-200 mt-3 font-medium">
                    Pressione o sensor biométrico
                  </p>
                </div>
              )}

              {/* Scanning Target Hologram & Laser */}
              {authMethod === 'facial' && (
                <>
                  <div className="absolute inset-4 rounded-full border border-cyan-400/50 pointer-events-none" />
                  <div className="absolute top-1/2 left-4 right-4 h-px bg-cyan-400/30 pointer-events-none" />
                  <div className="absolute left-1/2 top-4 bottom-4 w-px bg-cyan-400/30 pointer-events-none" />

                  {/* Laser bar animation */}
                  <div className="scanner-laser" />
                </>
              )}

              {/* Scanning HUD overlay status */}
              {isScanning && (
                <div className="absolute inset-0 bg-[#0D1B3D]/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="font-['Poppins',sans-serif] font-bold text-white text-sm">
                    Reconhecendo Aluno...
                  </p>
                  <p className="text-xs text-cyan-300">Cruzando base biométrica de Luanda</p>
                </div>
              )}
            </div>

            {/* Mode badge at bottom of circle */}
            <div className="absolute -bottom-3 bg-[#101F42] border border-blue-400/40 text-cyan-300 px-4 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5">
              {authMethod === 'facial' ? (
                <>
                  <ScanFace className="w-3.5 h-3.5" />
                  <span>Scan Facial Ativo</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>Leitor Dactilar</span>
                </>
              )}
            </div>
          </div>

          {/* Real WebCam Toggle */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setIsWebcamActive(!isWebcamActive)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isWebcamActive
                  ? 'bg-cyan-500 text-slate-900 font-semibold shadow-md'
                  : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isWebcamActive ? 'Câmera Real Ativa' : 'Ativar Câmera do Totem'}</span>
            </button>

            <button
              onClick={() => setAuthMethod(authMethod === 'facial' ? 'fingerprint' : 'facial')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Alternar para {authMethod === 'facial' ? 'Digital' : 'Facial'}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Interactive Controls & Feedback */}
        <div className="w-full max-w-md flex flex-col gap-5">
          {/* Main Control Card */}
          <div className="bg-[#101F42] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Poppins',sans-serif] font-bold text-lg text-white">
                Identificação do Aluno
              </h2>
              <span className="text-[11px] bg-blue-900/60 text-blue-300 px-2.5 py-0.5 rounded-md border border-blue-500/30">
                1º Ano A
              </span>
            </div>

            {/* Student Selector (Backup / Simulação) */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Aluno em Foco (Selecione para simular aproximação):
              </label>
              <div className="relative">
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setLastConfirmedLog(null);
                  }}
                  className="w-full bg-[#070D1E] border border-blue-500/30 text-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  {students.map((std) => (
                    <option key={std.id} value={std.id} className="bg-[#070D1E] text-white">
                      {std.name} — {std.className} (Mat: {std.matricula})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Preview Card */}
            <div className="bg-[#070D1E]/80 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 mb-5">
              <div className="w-13 h-13 rounded-xl overflow-hidden border border-white/20 shrink-0">
                <img
                  src={currentStudent.photoUrl}
                  alt={currentStudent.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="overflow-hidden flex-1">
                <p className="font-['Poppins',sans-serif] font-bold text-sm text-white truncate">
                  {currentStudent.name}
                </p>
                <p className="text-xs text-blue-200 truncate">
                  Encarregado: {currentStudent.parentName}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                  {currentStudent.biometricCode}
                </p>
              </div>
            </div>

            {/* Validate Button */}
            <button
              onClick={handleValidateScan}
              disabled={isScanning}
              className={`w-full py-4 px-6 rounded-2xl font-['Poppins',sans-serif] font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] cursor-pointer ${
                accessType === 'entry'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/30'
              }`}
            >
              {isScanning ? (
                <span>Validando Dados...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    Confirmar {accessType === 'entry' ? 'Entrada' : 'Saída'} de{' '}
                    {currentStudent?.name ? currentStudent.name.split(' ')[0] : 'Aluno'}
                  </span>
                </>
              )}
            </button>

            {/* Instruction note */}
            <p className="text-[11px] text-slate-400 text-center mt-3">
              Posicione o rosto no círculo e mantenha-se imóvel por 1 segundo.
            </p>
          </div>

          {/* Validation Feedback Modal / Banner */}
          {lastConfirmedLog && (
            <div className="bg-emerald-950/80 border-2 border-emerald-500/60 rounded-3xl p-5 shadow-2xl animate-fade-in text-emerald-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-['Poppins',sans-serif] font-bold text-base text-white">
                      {lastConfirmedLog.type === 'entry' ? 'Entrada Confirmada!' : 'Saída Confirmada!'}
                    </h3>
                    <p className="text-xs text-emerald-300">
                      Notificação instantânea entregue aos pais via Push
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono bg-emerald-900/60 text-emerald-300 px-2 py-1 rounded-lg border border-emerald-500/30">
                  {lastConfirmedLog.timestamp}
                </span>
              </div>

              <div className="bg-black/30 rounded-xl p-3 text-xs space-y-1 mb-3 text-slate-200">
                <p>
                  <strong>Aluno:</strong> {lastConfirmedLog.studentName} ({lastConfirmedLog.className})
                </p>
                <p>
                  <strong>Local:</strong> {lastConfirmedLog.location}
                </p>
                <p>
                  <strong>Método:</strong>{' '}
                  {lastConfirmedLog.method === 'facial'
                    ? 'Reconhecimento Facial'
                    : 'Biometria Dactilar'}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedReceiptLog(lastConfirmedLog)}
                  className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-white underline font-medium"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Ver Comprovante Digital Oficial</span>
                </button>

                <span className="text-[10px] text-emerald-400 font-mono">
                  {lastConfirmedLog.receiptCode.slice(0, 18)}...
                </span>
              </div>
            </div>
          )}

          {/* Local Buffer / Offline queue bar */}
          <div className="bg-[#101F42]/60 border border-white/5 rounded-2xl p-3 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Armazenamento local em cache</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/20">
              0 pendentes
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
