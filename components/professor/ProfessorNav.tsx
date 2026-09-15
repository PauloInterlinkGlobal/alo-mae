'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/LogoImg';
import { useSystem } from '@/lib/context';
import { Users, Send, LogOut, BookOpen, Clock, UserCheck, FileSpreadsheet, Megaphone } from 'lucide-react';

export const ProfessorNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, students } = useSystem();

  const classStudents = students.filter((s) => s.classId === '1a' || s.classId === 'turma_10a');
  const presentCount = classStudents.filter((s) => s.status === 'present').length;
  const absentCount = classStudents.filter((s) => s.status === 'absent').length;

  return (
    <header className="bg-[#0D1B3D] text-white border-b border-white/10 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand + Context */}
          <div className="flex items-center gap-4">
            <Link href="/professor/turma">
              <Logo variant="light" size="sm" showSubtitle={false} />
            </Link>

            <div className="hidden sm:block h-6 w-px bg-white/20" />

            <div className="hidden sm:flex items-center gap-2">
              <div className="bg-[#143A7B] text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-blue-400/30">
                <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                <span>10ª Classe A</span>
              </div>
              <span className="text-xs text-blue-200">Sala 102 • Turno Manhã</span>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
            <Link
              href="/professor/turma"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                pathname === '/professor/turma'
                  ? 'bg-[#143A7B] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Turma & Presenças</span>
            </Link>

            <Link
              href="/professor/mini-pautas"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                pathname === '/professor/mini-pautas'
                  ? 'bg-[#143A7B] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Mini Pautas</span>
            </Link>

            <Link
              href="/professor/notificar"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                pathname === '/professor/notificar'
                  ? 'bg-[#143A7B] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Notificar Pais</span>
            </Link>

            <Link
              href="/professor/anuncios"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                pathname === '/professor/anuncios'
                  ? 'bg-[#143A7B] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Anúncios & Aulas</span>
            </Link>
          </div>

          {/* Teacher Profile & Logout */}
          <div className="flex items-center gap-3">
            {/* Quick Live Stats Pill */}
            <div className="hidden md:flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{presentCount} presentes</span>
              </div>
              <div className="w-1 h-3 bg-white/20 rounded-full" />
              <div className="flex items-center gap-1 text-rose-400 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>{absentCount} ausentes</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                <img
                  src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1580894732488-82550bfa3f80?w=200'}
                  alt="Professor"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-white leading-tight">
                  {currentUser?.name || currentUser?.nome || 'Profª. Maria Fernandes'}
                </p>
                <p className="text-[10px] text-blue-200">Docente Titular</p>
              </div>

              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                title="Terminar Sessão"
                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-white/10 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
