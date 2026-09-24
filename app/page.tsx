'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/lib/context';
import { Logo } from '@/components/LogoImg';
import {
  Users,
  GraduationCap,
  Building2,
  ScanFace,
  ArrowRight,
  ShieldCheck,
  HeartPulse,
  Sparkles,
  ChevronRight,
  LogOut,
} from 'lucide-react';

export default function RootPortalPage() {
  const router = useRouter();
  const { currentUser, isAuthenticated, logout } = useSystem();

  const getPortalUrl = () => {
    if (!currentUser) return '/login';
    if (currentUser.role === 'pai' || (currentUser.role as any) === 'encarregado') return '/pai/inicio';
    if (currentUser.role === 'professor') return '/professor/turma';
    if (currentUser.role === 'instituicao' || currentUser.role === 'admin') return '/admin/dashboard';
    return '/login';
  };

  return (
    <div className="min-h-screen bg-[#0D1B3D] text-white flex flex-col justify-between relative overflow-hidden font-['Inter',sans-serif]">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#143A7B]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="p-4 sm:p-6 relative z-10 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Logo variant="light" size="md" />

        <div className="flex items-center gap-3">
          <Link
            href="/aluno/terminal"
            className="flex items-center gap-2 bg-blue-950/80 hover:bg-[#143A7B] border border-blue-500/30 text-blue-200 hover:text-white px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm"
          >
            <ScanFace className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Dispositivo:</span>
            <span className="font-semibold text-white">Terminal Biométrico</span>
          </Link>
        </div>
      </header>

      {/* Active Session Notification (if already logged in) */}
      {isAuthenticated && currentUser && (
        <div className="max-w-4xl mx-auto w-full px-4 mb-4 relative z-10">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-bold text-sm">
                ✓
              </div>
              <div>
                <p className="text-xs text-blue-200 font-medium">Sessão ativa detetada</p>
                <p className="text-sm font-semibold text-white">
                  {currentUser.name} — <span className="capitalize text-emerald-400 font-bold">{currentUser.role}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => router.push(getPortalUrl())}
                className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-[#0D1B3D] px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <span>Aceder ao meu Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => logout()}
                title="Terminar sessão"
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-10 max-w-5xl mx-auto w-full">
        {/* Hero Title */}
        <div className="text-center max-w-2xl mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 px-3.5 py-1.5 rounded-full text-xs text-blue-300 font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Plataforma Integrada de Conexão Escolar</span>
          </div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl sm:text-4xl tracking-tight text-white mb-3">
            Selecione o seu portal de acesso
          </h1>
          <p className="text-blue-200 text-xs sm:text-sm">
            Escolha o perfil correspondente para autenticar com segurança no ecossistema escolar Alô mãe.
          </p>
        </div>

        {/* 3 Main Role Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
          {/* 1. Portal do Encarregado (Pai/Mãe) */}
          <Link
            href="/login"
            className="group bg-white rounded-3xl p-6 sm:p-7 text-slate-900 border border-white/20 hover:border-blue-400 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform" />

            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-[#143A7B] text-white flex items-center justify-center mb-5 shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform">
                <Users className="w-7 h-7 text-blue-200" />
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md mb-2 inline-block">
                Portal Família
              </span>
              <h2 className="font-['Poppins',sans-serif] font-bold text-xl text-[#0D1B3D] mb-2">
                Encarregado de Educação
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
                Acompanhe a frequência biométrica dos seus educandos, comprovativos de presença, mini pautas, guia médica SOS e mensagens com professores.
              </p>
            </div>

            <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between text-[#143A7B] font-semibold text-xs group-hover:text-blue-700">
              <span>Entrar como Encarregado</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-[#143A7B] group-hover:text-white flex items-center justify-center transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* 2. Portal do Professor */}
          <Link
            href="/login-prof"
            className="group bg-white rounded-3xl p-6 sm:p-7 text-slate-900 border border-white/20 hover:border-indigo-400 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            hidden
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform" />

            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-900 text-white flex items-center justify-center mb-5 shadow-md shadow-indigo-950/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-7 h-7 text-indigo-200" />
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2 inline-block">
                Corpo Docente
              </span>
              <h2 className="font-['Poppins',sans-serif] font-bold text-xl text-[#0D1B3D] mb-2">
                Professor / Docente
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
                Gestão das suas turmas atribuídas, lançamento de notas e mini pautas, registo de faltas justificadas e comunicação direta com as famílias.
              </p>
            </div>

            <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between text-indigo-900 font-semibold text-xs group-hover:text-indigo-700">
              <span>Entrar como Professor</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-900 group-hover:text-white flex items-center justify-center transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* 3. Portal da Instituição */}
          <Link
            href="/login-admin"
            className="group bg-white rounded-3xl p-6 sm:p-7 text-slate-900 border border-white/20 hover:border-sky-400 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            hidden
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-sky-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform" />

            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-5 shadow-md shadow-slate-900/20 group-hover:scale-105 transition-transform">
                <Building2 className="w-7 h-7 text-sky-300" />
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md mb-2 inline-block">
                Administração
              </span>
              <h2 className="font-['Poppins',sans-serif] font-bold text-xl text-[#0D1B3D] mb-2">
                Instituição de Ensino
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
                Painel administrativo completo: gestão e criação de encarregados e professores, apólices de seguro, aprovação de mini pautas e auditoria.
              </p>
            </div>

            <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-900 font-semibold text-xs group-hover:text-sky-700">
              <span>Aceder à Administração</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Links Footer Banner */}
        <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-4 text-xs text-blue-300">
          <Link
            href="/validar/guia"
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
            hidden
          >
            <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
            <span>Validação de Guia Médica SOS</span>
          </Link>

          <Link
            href="/aluno/terminal"
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
          >
            <ScanFace className="w-3.5 h-3.5 text-cyan-400" />
            <span>Quiosque Biométrico de Portaria</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 relative z-10 text-center text-slate-400 text-xs">
        <p>© 2026 Alô mãe — Conexão que cuida. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
