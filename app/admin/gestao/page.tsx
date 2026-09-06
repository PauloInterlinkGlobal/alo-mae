'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TurmasTab } from '@/components/admin/gestao/TurmasTab';
import { AlunosTab } from '@/components/admin/gestao/AlunosTab';
import { ProfessoresTab } from '@/components/admin/gestao/ProfessoresTab';
import { PaisTab } from '@/components/admin/gestao/PaisTab';
import {
  School,
  Users,
  GraduationCap,
  HeartHandshake,
  ShieldAlert,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function GestaoEscolarPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'turmas' | 'alunos' | 'professores' | 'pais') || 'turmas';
  const [activeTab, setActiveTab] = useState<'turmas' | 'alunos' | 'professores' | 'pais'>(initialTab);

  const tabs = [
    {
      id: 'turmas',
      label: 'Turmas (Classes)',
      sub: 'Entidade Mestre',
      icon: School,
    },
    {
      id: 'alunos',
      label: 'Alunos Matriculados',
      sub: 'Matrícula & Biometria',
      icon: Users,
    },
    {
      id: 'professores',
      label: 'Corpo Docente',
      sub: 'Atribuição de Turmas',
      icon: GraduationCap,
    },
    {
      id: 'pais',
      label: 'Encarregados de Educação',
      sub: 'Consulta & Contactos',
      icon: HeartHandshake,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-[#0D1B3D] text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-lg border border-blue-900/60">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-blue-400/20">
              <Layers className="w-3.5 h-3.5" />
              <span>Módulo Institucional • Gestão Escolar (v3)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Gestão de Turmas, Alunos e Comunidade
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Administração de turmas (classes), matrícula transacional de alunos com vinculação biométrica e aos encarregados,
              atribuição de docentes e consulta aos perfis dos pais.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Zero-Trust RBAC</p>
              <p className="text-xs font-bold text-white">Custom Claims Ativas</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill bar */}
        <div className="flex flex-wrap gap-2 pt-6 mt-6 border-t border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-[#0D1B3D] shadow-md scale-[1.02]'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#143A7B]' : 'text-slate-400'}`} />
                <div className="text-left">
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab View */}
      <div className="transition-all duration-200">
        {activeTab === 'turmas' && <TurmasTab />}
        {activeTab === 'alunos' && <AlunosTab />}
        {activeTab === 'professores' && <ProfessoresTab />}
        {activeTab === 'pais' && <PaisTab />}
      </div>
    </div>
  );
}
