'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/LogoImg';
import {
  LayoutDashboard,
  ShieldCheck,
  FileSpreadsheet,
  ScanFace,
  School,
  ExternalLink,
  GraduationCap,
  Users,
  Megaphone,
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard Geral',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      desc: 'KPIs, gráficos e feed em tempo real',
    },
    {
      label: 'Gestão Escolar',
      href: '/admin/gestao',
      icon: Users,
      desc: 'Turmas, alunos, docentes e encarregados',
    },
    {
      label: 'Mini Pautas',
      href: '/admin/mini-pautas',
      icon: GraduationCap,
      desc: 'Homologação e aprovação de notas',
    },
    {
      label: 'Moderação de Anúncios',
      href: '/admin/anuncios',
      icon: Megaphone,
      desc: 'Aprovação de aulas e explicações',
    },
    {
      label: 'Seguro & Clínicas',
      href: '/admin/seguro',
      icon: ShieldCheck,
      desc: 'Rede hospitalar e apólices 24h',
    },
    {
      label: 'Relatórios Excel',
      href: '/admin/relatorios',
      icon: FileSpreadsheet,
      desc: 'Exportação e consolidado (.xlsx)',
    },
    {
      label: 'Terminal Simulado',
      href: '/admin/terminal-simulado',
      icon: ScanFace,
      desc: 'Demonstração do scan facial',
    },
  ];

  return (
    <aside className="w-64 bg-[#0D1B3D] text-white flex flex-col shrink-0 border-r border-white/10 min-h-screen">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-white/10">
        <Link href="/admin/dashboard">
          <Logo variant="light" size="md" />
        </Link>
        <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#143A7B] flex items-center justify-center text-blue-300 shrink-0">
            <School className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">Colégio Horizonte</p>
            <p className="text-[10px] text-blue-200 truncate">Luanda, Angola</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Módulos Administrativos
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-[#143A7B] text-white shadow-md font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 font-medium'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-300 group-hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight">{item.label}</p>
                <p className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate mt-0.5">
                  {item.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Terminal Kiosk Quick Link */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="bg-[#143A7B]/50 border border-blue-400/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-blue-200">Terminal da Portaria</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-[10px] text-slate-300 mb-2.5">
            Ecrã de hardware biométrico fixo da escola.
          </p>
          <Link
            href="/aluno/terminal"
            target="_blank"
            className="w-full bg-[#143A7B] hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <span>Abrir Totem Portaria</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </aside>
  );
};
