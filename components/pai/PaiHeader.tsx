'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/lib/context';
import { Logo } from '@/components/Logo';
import { Bell, HeartPulse, ChevronDown, LogOut, ShieldCheck, User } from 'lucide-react';

export const PaiHeader: React.FC = () => {
  const { currentUser, selectedStudent, students, setSelectedStudent, unreadCount, setActiveMedicalGuide, clinics, logout } = useSystem();
  const router = useRouter();

  const myStudents = students.filter((s) => s.id === 'std-1' || s.id === 'std-2');

  const handleSOS = () => {
    setActiveMedicalGuide({
      student: selectedStudent,
      clinic: clinics[0],
    });
  };

  return (
    <header className="bg-[#0D1B3D] text-white border-b border-white/10 sticky top-0 z-40 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link href="/pai/inicio" className="shrink-0">
          <Logo variant="light" size="sm" showSubtitle={false} />
        </Link>

        {/* Student Selector */}
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="flex items-center gap-2 bg-[#143A7B]/80 hover:bg-[#143A7B] px-3 py-1.5 rounded-full border border-blue-400/30 text-xs font-medium text-white transition-all">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[180px]">{selectedStudent.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-blue-200 shrink-0" />
            </button>

            <div className="absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 hidden group-hover:block z-50 text-slate-800">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Meus Educandos
              </div>
              {myStudents.map((std) => (
                <button
                  key={std.id}
                  onClick={() => setSelectedStudent(std)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    selectedStudent.id === std.id ? 'bg-blue-50 text-[#143A7B] font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        std.status === 'present' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <span>{std.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{std.className}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Quick SOS Medical Guide Button */}
          <button
            onClick={handleSOS}
            title="Emitir Guia Médica SOS 24h"
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all animate-bounce duration-1000"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guia SOS</span>
          </button>

          {/* Notifications link */}
          <Link
            href="/pai/notificacoes"
            className="relative p-2 rounded-full bg-white/5 hover:bg-white/15 text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-[10px] font-bold rounded-full flex items-center justify-center text-white ring-2 ring-[#0D1B3D]">
                {unreadCount}
              </span>
            )}
          </Link>

          {/* User Profile / Logout */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 p-1 rounded-full hover:bg-white/10 transition-colors">
              <div className="w-7 h-7 rounded-full bg-blue-400/20 border border-white/20 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-2 hidden group-hover:block z-50 text-slate-800">
              <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                <p className="text-xs font-semibold text-slate-900">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-500">{currentUser?.title || 'Encarregada de Educação'}</p>
              </div>
              <Link
                href="/pai/perfil"
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Meu Perfil</span>
              </Link>
              <Link
                href="/pai/seguro"
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Seguro Escolar 24h</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border-t border-slate-100 mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Terminar Sessão</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
