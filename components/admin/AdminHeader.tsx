'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/lib/context';
import {
  Activity,
  FileSpreadsheet,
  ScanFace,
  LogOut,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { exportGeneralExcel } from '@/lib/excel-export';

export const AdminHeader: React.FC = () => {
  const { currentUser, logout, students, classStats, logs } = useSystem();
  const router = useRouter();

  const handleExportAll = () => {
    exportGeneralExcel(classStats, students);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <Activity className="w-3.5 h-3.5" />
            <span>Servidor Conectado • Luanda</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
            <span>Hoje:</span>
            <span className="font-semibold text-slate-800">
              {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Right Action buttons & User Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Scanner Shortcut */}
          <Link
            href="/admin/terminal-simulado"
            className="flex items-center gap-1.5 bg-[#0D1B3D] hover:bg-[#143A7B] text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-sm"
          >
            <ScanFace className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abrir Câmera Scanner</span>
          </Link>

          {/* Export Excel Button */}
          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Relatórios Excel</span>
          </button>

          <div className="h-6 w-px bg-slate-200" />

          {/* User profile */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200'}
                alt="Admin"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser?.name || currentUser?.nome || 'Paulo Pinto'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                {currentUser?.title || 'Administrador Geral da Instituição'}
              </p>
            </div>

            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              title="Terminar Sessão"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
