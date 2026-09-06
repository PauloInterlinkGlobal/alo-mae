'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSystem } from '@/lib/context';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Sparkles,
  Phone,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { AttendanceStatus } from '@/lib/types';

export default function ProfessorTurmaPage() {
  const { students, updateStudentStatus } = useSystem();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');

  const classStudents = students.filter((s) => s.classId === '1a');

  const presentCount = classStudents.filter((s) => s.status === 'present').length;
  const absentCount = classStudents.filter((s) => s.status === 'absent').length;
  const lateCount = classStudents.filter((s) => s.status === 'late').length;

  const filteredStudents = classStudents.filter((student) => {
    if (statusFilter !== 'all' && student.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (student.name || student.fullName || '').toLowerCase().includes(q) ||
        (student.parentName || '').toLowerCase().includes(q) ||
        (student.matricula || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl text-[#0D1B3D]">
            Lista da Turma & Controlo de Presenças
          </h1>
          <p className="text-sm text-slate-500">
            1º Ano A • Sala 102 • Gestão em tempo real sincronizada com a portaria
          </p>
        </div>

        <Link
          href="/professor/notificar"
          className="inline-flex items-center gap-2 bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <Send className="w-4 h-4" />
          <span>Enviar Notificação aos Pais</span>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total da Turma
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-['Poppins',sans-serif] font-bold text-2xl text-slate-900">
              {classStudents.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Alunos matriculados</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Presentes Hoje
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-['Poppins',sans-serif] font-bold text-2xl text-emerald-700">
              {presentCount}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              {Math.round((presentCount / classStudents.length) * 100)}% em sala
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
            Ausentes / Faltas
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-['Poppins',sans-serif] font-bold text-2xl text-rose-700">
              {absentCount}
            </span>
            <span className="text-xs text-rose-600 font-semibold">
              {absentCount > 0 ? 'Pais notificados' : 'Nenhuma falta'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
            Atrasos
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-['Poppins',sans-serif] font-bold text-2xl text-amber-700">
              {lateCount}
            </span>
            <span className="text-xs text-amber-600 font-semibold">Após as 07h45</span>
          </div>
        </div>
      </div>

      {/* Roster Controls & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou encarregado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#143A7B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({classStudents.length})
          </button>
          <button
            onClick={() => setStatusFilter('present')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'present'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Presentes ({presentCount})
          </button>
          <button
            onClick={() => setStatusFilter('absent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'absent'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ausentes ({absentCount})
          </button>
          <button
            onClick={() => setStatusFilter('late')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'late'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Atrasados ({lateCount})
          </button>
        </div>
      </div>

      {/* Students Call Roster Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Aluno(a)</th>
                <th className="px-6 py-4">Encarregado / Contacto</th>
                <th className="px-6 py-4">Horário de Entrada</th>
                <th className="px-6 py-4">Registo Biométrico</th>
                <th className="px-6 py-4 text-center">Status / Marcação da Chamada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Student */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                        <img
                          src={student.photoUrl}
                          alt={student.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">{student.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">Mat: {student.matricula}</p>
                      </div>
                    </div>
                  </td>

                  {/* Parent */}
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{student.parentName}</p>
                    <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{student.parentPhone}</span>
                    </p>
                  </td>

                  {/* Entry time */}
                  <td className="px-6 py-4 font-mono text-slate-700">
                    {student.lastEntryTime ? (
                      <span className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>{student.lastEntryTime}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Sem registo na portaria</span>
                    )}
                  </td>

                  {/* Biometrics */}
                  <td className="px-6 py-4">
                    <span className="text-[10px] bg-blue-50 text-[#143A7B] font-mono px-2 py-1 rounded-md border border-blue-200">
                      {student.biometricCode}
                    </span>
                  </td>

                  {/* Presence Status Toggle */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-[240px] mx-auto">
                      <button
                        onClick={() => updateStudentStatus(student.id, 'present')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          student.status === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Presente
                      </button>
                      <button
                        onClick={() => updateStudentStatus(student.id, 'absent')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          student.status === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Falta
                      </button>
                      <button
                        onClick={() => updateStudentStatus(student.id, 'late')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          student.status === 'late'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Atraso
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
