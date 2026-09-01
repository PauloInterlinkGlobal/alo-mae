'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSystem } from '@/lib/context';
import { AccessLog } from '@/lib/types';
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
  UserCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AdminTerminalSimuladoPage() {
  const { students, registerBiometricAccess, setSelectedReceiptLog } = useSystem();

  const [accessType, setAccessType] = useState<'entry' | 'exit'>('entry');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0].id);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastLog, setLastLog] = useState<AccessLog | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];

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
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isWebcamActive]);

  const handleSimulate = () => {
    setIsScanning(true);
    setTimeout(async () => {
      setIsScanning(false);
      const log = await registerBiometricAccess(currentStudent.id, accessType, 'facial');
      setLastLog(log);
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {
        // fallback
      }
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl text-[#0D1B3D]">
            Terminal Simulado de Reconhecimento Facial
          </h1>
          <p className="text-sm text-slate-500">
            Ambiente de testes e demonstração para administradores da instituição
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

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
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
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full flex items-center justify-center p-2.5 bg-gradient-to-b from-[#143A7B]/40 to-transparent border-2 border-dashed border-cyan-400/40 shadow-[0_0_40px_rgba(6,182,212,0.25)]">
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
              </div>
            </div>

            {/* Camera Switcher Button */}
            <button
              onClick={() => setIsWebcamActive(!isWebcamActive)}
              className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-300 hover:text-white transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isWebcamActive ? 'Desativar WebCam' : 'Ativar WebCam do Meu Computador'}</span>
            </button>
          </div>

          {/* Right Column: Controls & Demonstration Actions */}
          <div className="space-y-5">
            <div className="bg-[#101F42] border border-white/10 rounded-2xl p-5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Selecione o Aluno (Simulação de Câmera):
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
                    {std.name} — {std.className} (Enc: {std.parentName})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#101F42]/80 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 shrink-0">
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
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={isScanning}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-['Poppins',sans-serif] font-bold text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isScanning ? (
                <span>Escaneando e Cruzando Dados...</span>
              ) : (
                <>
                  <ScanFace className="w-5 h-5" />
                  <span>
                    Confirmar {accessType === 'entry' ? 'Entrada' : 'Saída'} de{' '}
                    {currentStudent.name.split(' ')[0]}
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
                    <span>Acesso Registado com Sucesso!</span>
                  </span>
                  <span className="font-mono text-emerald-300">{lastLog.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Notificação Push despachada para {currentStudent.parentName} ({currentStudent.parentPhone}).
                </p>
                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedReceiptLog(lastLog)}
                    className="text-cyan-300 hover:underline font-semibold text-xs"
                  >
                    Ver Comprovante Oficial
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
