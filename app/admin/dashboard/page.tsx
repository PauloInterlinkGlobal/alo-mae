'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSystem } from '@/lib/context';
import {
  Users,
  ScanFace,
  Bell,
  ShieldCheck,
  TrendingUp,
  Clock,
  MapPin,
  CheckCircle2,
  FileCheck,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { logs, students, classStats, setSelectedReceiptLog } = useSystem();
  const [chartView, setChartView] = useState<'week' | 'month'>('week');

  const totalStudents = students.length;
  const totalBiometricScans = 1842 + logs.length;
  const recentLogs = logs.slice(0, 7);

  // Hourly arrival distribution
  const arrivalBands = [
    { band: '06:45 – 07:00', pct: 8, count: 19 },
    { band: '07:00 – 07:15', pct: 24, count: 58 },
    { band: '07:15 – 07:30 (Pico)', pct: 46, count: 110, isPeak: true },
    { band: '07:30 – 07:45', pct: 18, count: 43 },
    { band: 'Após 07:45 (Atrasos)', pct: 4, count: 10, isLate: true },
  ];

  // Frequency curve data
  const weekData = [
    { label: 'Seg', rate: 97 },
    { label: 'Ter', rate: 98 },
    { label: 'Qua', rate: 95 },
    { label: 'Qui', rate: 96 },
    { label: 'Sex (Hoje)', rate: 96.4 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl text-[#0D1B3D]">
            Painel Administrativo — Alô mãe
          </h1>
          <p className="text-sm text-slate-500">
            Monitorização em tempo real de acessos biométricos, segurança e assiduidade escolar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/terminal-simulado"
            className="flex items-center gap-2 bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <ScanFace className="w-4 h-4 text-cyan-300" />
            <span>Simular Reconhecimento Facial</span>
          </Link>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Presença Média */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Presença Média
            </span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-['Poppins',sans-serif] font-bold text-3xl text-slate-900">
              96.4%
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              +1.2% <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">231 alunos presentes de 240</p>
        </div>

        {/* KPI 2: Leituras Biométricas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Leituras Biométricas
            </span>
            <div className="p-2 bg-blue-50 rounded-xl text-[#143A7B]">
              <ScanFace className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-['Poppins',sans-serif] font-bold text-3xl text-slate-900">
              {totalBiometricScans.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-blue-600">Hoje</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Facial (92%) • Digital (8%)</p>
        </div>

        {/* KPI 3: Notificações aos Pais */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Notificações aos Pais
            </span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-['Poppins',sans-serif] font-bold text-3xl text-slate-900">
              98.9%
            </span>
            <span className="text-xs font-semibold text-purple-600">Entregues</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tempo médio de entrega: 0.8s</p>
        </div>

        {/* KPI 4: Seguro Escolar Ativo */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Seguro Escolar 24h
            </span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-['Poppins',sans-serif] font-bold text-3xl text-emerald-700">
              240/240
            </span>
            <span className="text-xs font-semibold text-emerald-600">100%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Apólice coletiva protegida</p>
        </div>
      </div>

      {/* Middle Grid: Frequency Curve & Arrival Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Frequency Curve Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D]">
                Curva de Frequência dos Alunos
              </h2>
              <p className="text-xs text-slate-500">
                Evolução diária da assiduidade e validações de entrada
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setChartView('week')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartView === 'week' ? 'bg-white text-[#143A7B] shadow-xs' : 'text-slate-500'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setChartView('month')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartView === 'month' ? 'bg-white text-[#143A7B] shadow-xs' : 'text-slate-500'
                }`}
              >
                Mês
              </button>
            </div>
          </div>

          {/* Graphical Bars Visualizer */}
          <div className="h-56 flex items-end justify-between gap-4 pt-6 border-b border-slate-100 pb-2 px-4">
            {weekData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[11px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.rate}%
                </span>
                <div
                  className="w-full max-w-[48px] bg-gradient-to-t from-[#0D1B3D] to-[#143A7B] rounded-t-xl transition-all duration-500 group-hover:brightness-125"
                  style={{ height: `${(item.rate - 85) * 6}%` }}
                />
                <span className="text-xs font-medium text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-[#143A7B]" />
              <span>Presenças Confirmadas via Biometria</span>
            </span>
            <span className="font-semibold text-slate-800">Média Geral: 96.4%</span>
          </div>
        </div>

        {/* Arrival Distribution (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D]">
                  Horários de Chegada
                </h2>
                <p className="text-xs text-slate-500">Faixas de entrada na portaria</p>
              </div>
              <Clock className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-3.5">
              {arrivalBands.map((band, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={`font-semibold ${band.isPeak ? 'text-[#143A7B]' : 'text-slate-700'}`}>
                      {band.band}
                    </span>
                    <span className="font-bold text-slate-900">{band.pct}% ({band.count})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        band.isPeak
                          ? 'bg-[#143A7B]'
                          : band.isLate
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${band.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-100 mt-4 text-xs text-blue-900">
            <p className="font-semibold mb-0.5">💡 Pico de Fluxo:</p>
            <p className="text-[11px] text-blue-800">
              46% dos alunos entram entre as 07h15 e as 07h30. Os 3 totens de entrada suportam a demanda sem filas.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Live Facial Scan Feed & Today's Absence Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Facial Scan Feed (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D]">
                Feed de Leitura Facial em Tempo Real
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Totens 01, 02 e 03</span>
          </div>

          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedReceiptLog(log)}
                className="p-3 bg-slate-50 hover:bg-blue-50/70 rounded-2xl border border-slate-200/70 flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    <img
                      src={log.studentPhoto}
                      alt={log.studentName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#143A7B]">
                        {log.studentName}
                      </p>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                        {log.className}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{log.location}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold">{log.statusNote}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-900 block">
                    {log.timestamp}
                  </span>
                  <span className="text-[10px] text-[#143A7B] font-semibold group-hover:underline">
                    Ver Comprovante
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Absence distribution by class (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <h2 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D] mb-1">
            Distribuição de Faltas do Dia
          </h2>
          <p className="text-xs text-slate-500 mb-4">Resumo por turmas em Luanda</p>

          <div className="space-y-3">
            {classStats.map((cls) => (
              <div
                key={cls.classId}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-xs text-slate-900">{cls.className}</p>
                  <p className="text-[10px] text-slate-400">{cls.teacherName}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800">
                      {cls.presentsToday}/{cls.totalStudents}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Presentes</span>
                  </div>

                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      cls.absentsToday === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {cls.absentsToday} {cls.absentsToday === 1 ? 'falta' : 'faltas'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/admin/relatorios"
            className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Ver Relatório Completo</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
