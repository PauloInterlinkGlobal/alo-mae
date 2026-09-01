'use client';

import React from 'react';
import Link from 'next/link';
import { useSystem } from '@/lib/context';
import {
  ShieldCheck,
  Clock,
  MapPin,
  FileCheck,
  HeartPulse,
  ArrowRight,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Bell,
  GraduationCap,
  Award,
} from 'lucide-react';

export default function PaiInicioPage() {
  const {
    currentUser,
    selectedStudent,
    logs,
    notifications,
    setActiveMedicalGuide,
    setSelectedReceiptLog,
    clinics,
    miniPautas,
  } = useSystem();

  const studentLogs = logs.filter((l) => l.studentId === selectedStudent.id);
  const todayLogs = studentLogs.slice(0, 3);
  const latestLog = studentLogs[0];

  const recentUnreadNotif = notifications.find((n) => !n.isRead);

  // Notas aprovadas
  const pautasAprovadas = miniPautas.filter(
    (p) => p.status === 'aprovada' && (p.turma_id === selectedStudent.classId || p.turma_id === 'turma_10a' || selectedStudent.classId === '1a')
  );

  const handleOpenMedicalGuide = () => {
    setActiveMedicalGuide({
      student: selectedStudent,
      clinic: clinics[0],
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Personalized Greeting Header */}
      <div className="bg-gradient-to-br from-[#0D1B3D] via-[#143A7B] to-[#0D1B3D] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {/* Ambient lighting */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-200 bg-white/10 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Painel do Encarregado</span>
            </span>
            <span className="text-[11px] text-blue-200">Luanda, Angola</span>
          </div>

          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl tracking-tight text-white mb-1">
            Olá, {currentUser?.name?.split(' ')[0] || currentUser?.nome?.split(' ')[0] || 'Fernanda'}! 👋
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm font-normal">
            Acompanhe a frequência escolar, notas e proteção médica em tempo real.
          </p>
        </div>
      </div>

      {/* 2. Real-time Status Card for Selected Child */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#143A7B]/20 shadow-sm">
                <img
                  src={selectedStudent.photoUrl}
                  alt={selectedStudent.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  selectedStudent.status === 'present' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <h2 className="font-['Poppins',sans-serif] font-bold text-lg text-[#0D1B3D] leading-tight">
                  {selectedStudent.name}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {selectedStudent.className} • {selectedStudent.schoolName}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Matrícula: {selectedStudent.matricula}
              </p>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs ${
              selectedStudent.status === 'present'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                selectedStudent.status === 'present' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>{selectedStudent.status === 'present' ? 'Na Escola' : 'Ausente'}</span>
          </div>
        </div>

        {/* Status details bar */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Última Entrada Hoje
            </span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{selectedStudent.lastEntryTime || '07:32:15'}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Previsão de Saída
            </span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>12:30:00</span>
            </div>
          </div>
        </div>

        {/* Quick Receipt action if log exists */}
        {latestLog && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Validação biométrica facial confirmada</span>
            </span>
            <Link
              href={`/pai/comprovante?id=${latestLog.id}`}
              className="text-xs font-semibold text-[#143A7B] hover:underline flex items-center gap-1"
            >
              <span>Ver Comprovante</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* 3. Academic Mini Pautas Quick Card */}
      <Link
        href="/pai/pautas"
        className="bg-white hover:bg-slate-50/80 rounded-3xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between transition-all group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-['Poppins',sans-serif] font-bold text-sm text-slate-900 group-hover:text-[#143A7B]">
                Boletim & Mini Pautas Trimestrais
              </h3>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Oficial
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {pautasAprovadas.length > 0
                ? `${pautasAprovadas.length} disciplina(s) homologada(s) pela Direção Pedagógica.`
                : 'Acompanhe as notas de avaliação contínua e trimestral.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-[#143A7B]">
          <span>Ver Notas</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </Link>

      {/* 4. Unread notification highlight banner (if any) */}
      {recentUnreadNotif && (
        <Link
          href="/pai/notificacoes"
          className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900 hover:bg-amber-100/70 transition-colors shadow-xs"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="font-semibold text-amber-950 truncate">{recentUnreadNotif.title}</p>
              <p className="text-amber-800 text-[11px] truncate">{recentUnreadNotif.message}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-600 shrink-0 ml-2" />
        </Link>
      )}

      {/* 5. Activities of Today Section */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D]">
              Atividades de Hoje
            </h3>
            <p className="text-xs text-slate-500">Histórico de acessos na portaria</p>
          </div>

          <Link
            href="/pai/atividades"
            className="text-xs font-semibold text-[#143A7B] hover:underline flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {todayLogs.length > 0 ? (
            todayLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedReceiptLog(log)}
                className="p-3 bg-slate-50 hover:bg-blue-50/60 rounded-2xl border border-slate-200/60 flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                      log.type === 'entry'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {log.type === 'entry' ? 'ENT' : 'SAÍ'}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-[#143A7B]">
                      {log.type === 'entry' ? 'Entrada na Escola' : 'Saída Registada'}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{log.location}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 block font-mono">
                    {log.timestamp}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">Comprovante ✓</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs">
              Nenhuma atividade registada até o momento hoje.
            </div>
          )}
        </div>
      </div>

      {/* 6. School Insurance & Emergency Hospital Network Block */}
      <div className="bg-gradient-to-br from-emerald-900 via-[#0B3A2C] to-[#0D1B3D] text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-['Poppins',sans-serif] font-bold text-sm text-white">
                  Seguro Escolar 24h & Emergência
                </h3>
                <p className="text-[10px] text-emerald-300">
                  Apólice: {selectedStudent.insurancePolicyId}
                </p>
              </div>
            </div>

            <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Ativo
            </span>
          </div>

          <p className="text-xs text-slate-200 mb-4 leading-relaxed">
            Proteção médica contínua com cobertura para pronto-socorro, traumatologia e rede hospitalar credenciada em Luanda.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleOpenMedicalGuide}
              className="w-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              <HeartPulse className="w-4 h-4" />
              <span>Emitir Guia SOS</span>
            </button>

            <Link
              href="/pai/seguro"
              className="w-full bg-white/15 hover:bg-white/25 active:scale-95 text-white py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center"
            >
              <span>Ver Clínicas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
