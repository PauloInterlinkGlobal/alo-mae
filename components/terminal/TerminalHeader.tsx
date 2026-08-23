'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/LogoImg';
import { Wifi, ShieldCheck, Clock, MonitorCheck, ArrowLeft } from 'lucide-react';

export const TerminalHeader: React.FC = () => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-[#0D1B3D] border-b border-blue-900/60 px-6 py-3.5 flex items-center justify-between text-white shadow-xl">
      {/* Brand & Device ID */}
      <div className="flex items-center gap-4">
        <Logo variant="light" size="md" />
        <div className="h-6 w-px bg-white/20 hidden sm:block" />
        <div className="hidden sm:flex items-center gap-2 bg-blue-950/80 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-mono text-blue-300">
          <MonitorCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>TERMINAL #01 • GUÁRITA PRINCIPAL</span>
        </div>
      </div>

      {/* Center Clock */}
      <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-4 py-1.5 rounded-full text-white font-mono text-sm tracking-wider shadow-inner">
        <Clock className="w-4 h-4 text-cyan-400" />
        <span>{time || '--:--:--'}</span>
        <span className="text-[10px] text-blue-300 ml-1">LUANDA</span>
      </div>

      {/* Right Online Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Wifi className="w-3.5 h-3.5" />
          <span className="hidden md:inline">SISTEMA ONLINE (24H)</span>
        </div>

        <Link
          href="/login"
          className="p-1.5 bg-white/5 hover:bg-white/15 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Voltar ao Ecrã de Login"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
};
