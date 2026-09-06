'use client';

import React, { useState } from 'react';
import { useSystem } from '@/lib/context';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Phone,
} from 'lucide-react';
import { exportGeneralExcel, exportClassExcel } from '@/lib/excel-export';
import { ClassAttendanceStat } from '@/lib/types';

export default function AdminRelatoriosPage() {
  const { students, classStats } = useSystem();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

  const totalStudents = students.length;
  const totalPresentToday = students.filter((s) => s.status === 'present').length;
  const totalAbsentToday = students.filter((s) => s.status === 'absent').length;
  const avgFrequency = 96.4;

  const filteredStudents = students.filter((s) => {
    if (selectedClassFilter !== 'all' && s.classId !== selectedClassFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const studentName = (s.fullName || s.name || s.nome_completo || '').toLowerCase();
      const studentMatricula = (s.matricula || '').toLowerCase();
      const parentName = (s.parentName || '').toLowerCase();
      const className = (s.className || '').toLowerCase();
      return (
        studentName.includes(q) ||
        studentMatricula.includes(q) ||
        parentName.includes(q) ||
        className.includes(q)
      );
    }
    return true;
  });

  const handleExportGeneral = () => {
    exportGeneralExcel(classStats, students);
  };

  const handleExportClass = (cls: ClassAttendanceStat) => {
    exportClassExcel(cls, students);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl text-[#0D1B3D]">
            Relatórios de Presenças & Faltas
          </h1>
          <p className="text-sm text-slate-500">
            Exportação oficial consolidada em formato Excel (.xlsx) para a direção e coordenação
          </p>
        </div>

        <button
          onClick={handleExportGeneral}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exportar Relatório Geral em Excel (.xlsx)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total de Alunos
          </span>
          <p className="font-['Poppins',sans-serif] font-bold text-2xl text-slate-900 mt-1">
            240
          </p>
          <p className="text-[11px] text-slate-400">12 Turmas ativas</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Presenças Hoje
          </span>
          <p className="font-['Poppins',sans-serif] font-bold text-2xl text-emerald-700 mt-1">
            231
          </p>
          <p className="text-[11px] text-emerald-600">96.3% de assiduidade</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
            Faltas Hoje
          </span>
          <p className="font-['Poppins',sans-serif] font-bold text-2xl text-rose-700 mt-1">
            9
          </p>
          <p className="text-[11px] text-rose-600">Pais alertados em tempo real</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-[#143A7B] uppercase tracking-wider block">
            Média de Frequência
          </span>
          <p className="font-['Poppins',sans-serif] font-bold text-2xl text-[#143A7B] mt-1">
            {avgFrequency}%
          </p>
          <p className="text-[11px] text-blue-600">Acima da meta (90%)</p>
        </div>
      </div>

      {/* Class Consolidation Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D]">
            Consolidado de Presenças e Faltas por Turma
          </h2>
          <span className="text-xs text-slate-400 font-mono">Ano Letivo 2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Turma / Sala</th>
                <th className="px-4 py-3">Docente Responsável</th>
                <th className="px-4 py-3 text-center">Total Alunos</th>
                <th className="px-4 py-3 text-center">Presenças (Mês)</th>
                <th className="px-4 py-3 text-center">Faltas (Mês)</th>
                <th className="px-4 py-3 text-center">Atrasos</th>
                <th className="px-4 py-3 text-center">Taxa de Frequência</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStats.map((cls) => (
                <tr key={cls.classId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-900">
                    <div>{cls.className}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{cls.room}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">{cls.teacherName}</td>
                  <td className="px-4 py-3.5 text-center font-semibold text-slate-800">
                    {cls.totalStudents}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-emerald-700">
                    {cls.monthlyPresents}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-rose-700">
                    {cls.monthlyAbsences}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-amber-700">
                    {cls.monthlyLates}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${cls.frequencyRate}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-900">{cls.frequencyRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleExportClass(cls)}
                      className="inline-flex items-center gap-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel Turma</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Details Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D]">
              Detalhamento por Aluno
            </h2>
            <p className="text-xs text-slate-500">Registo nominal com encarregado e estado diário</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome ou matrícula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
              />
            </div>

            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
            >
              <option value="all">Todas as Turmas</option>
              <option value="1a">1º Ano A</option>
              <option value="2b">2º Ano B</option>
              <option value="3c">3º Ano C</option>
              <option value="4a">4º Ano A</option>
              <option value="5a">5º Ano A</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">Nome do Aluno</th>
                <th className="px-4 py-3">Turma</th>
                <th className="px-4 py-3">Status Hoje</th>
                <th className="px-4 py-3">Encarregado de Educação</th>
                <th className="px-4 py-3">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500 font-semibold">{s.matricula}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-700">{s.className}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        s.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'absent'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.status === 'present' ? 'Presente' : s.status === 'absent' ? 'Falta' : 'Atraso'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{s.parentName}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{s.parentPhone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
