'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSystem } from '@/lib/context';
import { AccessLog } from '@/lib/types';
import {
  History,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  FileCheck,
  ChevronRight,
  RotateCcw,
  X,
  CalendarRange,
} from 'lucide-react';

export type PeriodFilter =
  | 'all'
  | 'today'
  | 'week'
  | 'month'
  | 'trimestre_current'
  | 'trimestre_1'
  | 'trimestre_2'
  | 'trimestre_3'
  | 'semestre_current'
  | 'semestre_1'
  | 'semestre_2'
  | 'custom';

// Parse AccessLog date robustly across Firestore timestamps, receipt codes, and PT date strings
function parseLogDate(log: AccessLog): Date | null {
  // 1. Try Firestore createdAt timestamp if present
  if (log.createdAt) {
    if (typeof (log.createdAt as any).toDate === 'function') {
      return (log.createdAt as any).toDate();
    }
    if (typeof (log.createdAt as any).seconds === 'number') {
      return new Date((log.createdAt as any).seconds * 1000);
    }
    const d = new Date(log.createdAt);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Try receiptCode format CF-YYYYMMDD-HHMMSS...
  if (log.receiptCode) {
    const match = log.receiptCode.match(/CF-(\d{4})(\d{2})(\d{2})/i);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      if (log.timestamp) {
        const timeParts = log.timestamp.split(':');
        if (timeParts.length >= 2) {
          d.setHours(
            parseInt(timeParts[0], 10) || 0,
            parseInt(timeParts[1], 10) || 0,
            parseInt(timeParts[2], 10) || 0
          );
        }
      }
      return d;
    }
  }

  // 3. Try log.date string
  if (log.date) {
    const ptMonths: Record<string, number> = {
      janeiro: 0,
      fevereiro: 1,
      marco: 2,
      março: 2,
      abril: 3,
      maio: 4,
      junho: 5,
      julho: 6,
      agosto: 7,
      setembro: 8,
      outubro: 9,
      novembro: 10,
      dezembro: 11,
    };

    const ptMatch = log.date.match(/(\d{1,2})\s+de\s+([a-zA-Zçáéíóúãõ]+)\s+de\s+(\d{4})/i);
    if (ptMatch) {
      const day = parseInt(ptMatch[1], 10);
      const monthName = ptMatch[2]
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const year = parseInt(ptMatch[3], 10);
      const month = ptMonths[monthName] ?? ptMonths[ptMatch[2].toLowerCase()] ?? 0;
      const d = new Date(year, month, day);
      if (log.timestamp) {
        const timeParts = log.timestamp.split(':');
        if (timeParts.length >= 2) {
          d.setHours(
            parseInt(timeParts[0], 10) || 0,
            parseInt(timeParts[1], 10) || 0,
            parseInt(timeParts[2], 10) || 0
          );
        }
      }
      return d;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = log.date.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      return new Date(
        parseInt(dmyMatch[3], 10),
        parseInt(dmyMatch[2], 10) - 1,
        parseInt(dmyMatch[1], 10)
      );
    }

    // YYYY-MM-DD
    const ymdMatch = log.date.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      return new Date(
        parseInt(ymdMatch[1], 10),
        parseInt(ymdMatch[2], 10) - 1,
        parseInt(ymdMatch[3], 10)
      );
    }

    const fallback = new Date(log.date);
    if (!isNaN(fallback.getTime())) return fallback;
  }

  return null;
}

function matchesPeriod(
  log: AccessLog,
  period: PeriodFilter,
  customStart: string,
  customEnd: string
): boolean {
  if (period === 'all') return true;

  const logDate = parseLogDate(log);
  if (!logDate) return true; // If date cannot be parsed, avoid hiding records

  const now = new Date();
  const logYear = logDate.getFullYear();
  const logMonth = logDate.getMonth(); // 0-11
  const logDay = logDate.getDate();

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDay = now.getDate();

  if (period === 'today') {
    return logYear === nowYear && logMonth === nowMonth && logDay === nowDay;
  }

  if (period === 'week') {
    // Current week: Monday to Sunday
    const currentDayOfWeek = now.getDay();
    const diffToMonday = (currentDayOfWeek === 0 ? -6 : 1) - currentDayOfWeek;
    const startOfWeek = new Date(nowYear, nowMonth, nowDay + diffToMonday, 0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return logDate >= startOfWeek && logDate <= endOfWeek;
  }

  if (period === 'month') {
    return logYear === nowYear && logMonth === nowMonth;
  }

  // Academic Trimesters:
  // 1º Trimestre: Setembro a Dezembro (months 8, 9, 10, 11)
  // 2º Trimestre: Janeiro a Março (months 0, 1, 2)
  // 3º Trimestre: Abril a Julho (months 3, 4, 5, 6)
  if (period === 'trimestre_1') {
    return [8, 9, 10, 11].includes(logMonth);
  }

  if (period === 'trimestre_2') {
    return [0, 1, 2].includes(logMonth);
  }

  if (period === 'trimestre_3') {
    return [3, 4, 5, 6].includes(logMonth);
  }

  if (period === 'trimestre_current') {
    let currentTrim = 1;
    if ([8, 9, 10, 11].includes(nowMonth)) currentTrim = 1;
    else if ([0, 1, 2].includes(nowMonth)) currentTrim = 2;
    else currentTrim = 3;

    if (currentTrim === 1) return [8, 9, 10, 11].includes(logMonth);
    if (currentTrim === 2) return [0, 1, 2].includes(logMonth);
    return [3, 4, 5, 6].includes(logMonth);
  }

  // Academic Semesters:
  // 1º Semestre: Setembro a Janeiro (months 8, 9, 10, 11, 0)
  // 2º Semestre: Fevereiro a Julho (months 1, 2, 3, 4, 5, 6)
  if (period === 'semestre_1') {
    return [8, 9, 10, 11, 0].includes(logMonth);
  }

  if (period === 'semestre_2') {
    return [1, 2, 3, 4, 5, 6].includes(logMonth);
  }

  if (period === 'semestre_current') {
    const isFirstSemester = [8, 9, 10, 11, 0].includes(nowMonth);
    return isFirstSemester
      ? [8, 9, 10, 11, 0].includes(logMonth)
      : [1, 2, 3, 4, 5, 6].includes(logMonth);
  }

  if (period === 'custom') {
    if (!customStart && !customEnd) return true;
    const start = customStart ? new Date(customStart + 'T00:00:00') : null;
    const end = customEnd ? new Date(customEnd + 'T23:59:59') : null;

    if (start && end) return logDate >= start && logDate <= end;
    if (start) return logDate >= start;
    if (end) return logDate <= end;
    return true;
  }

  return true;
}

export default function PaiAtividadesPage() {
  const { selectedStudent, logs, setSelectedReceiptLog } = useSystem();
  const [filterType, setFilterType] = useState<'all' | 'entry' | 'exit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // All logs for the current selected student
  const studentLogs = useMemo(() => {
    return logs.filter((l) => l.studentId === selectedStudent.id);
  }, [logs, selectedStudent.id]);

  // Logs filtered by period (used to compute counts for Todas, Entradas, Saídas)
  const periodFilteredLogs = useMemo(() => {
    return studentLogs.filter((log) =>
      matchesPeriod(log, periodFilter, customStartDate, customEndDate)
    );
  }, [studentLogs, periodFilter, customStartDate, customEndDate]);

  // Logs filtered by Period + Type + Search Query
  const filteredLogs = useMemo(() => {
    return periodFilteredLogs.filter((log) => {
      if (filterType !== 'all' && log.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          log.date.toLowerCase().includes(q) ||
          log.timestamp.includes(q) ||
          log.location.toLowerCase().includes(q) ||
          log.receiptCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [periodFilteredLogs, filterType, searchQuery]);

  // Human-readable active period label
  const activePeriodLabel = useMemo(() => {
    switch (periodFilter) {
      case 'today':
        return 'Hoje';
      case 'week':
        return 'Esta Semana';
      case 'month':
        return 'Este Mês';
      case 'trimestre_current':
        return 'Este Trimestre';
      case 'trimestre_1':
        return '1º Trimestre (Set - Dez)';
      case 'trimestre_2':
        return '2º Trimestre (Jan - Mar)';
      case 'trimestre_3':
        return '3º Trimestre (Abr - Jul)';
      case 'semestre_current':
        return 'Este Semestre';
      case 'semestre_1':
        return '1º Semestre (Set - Jan)';
      case 'semestre_2':
        return '2º Semestre (Fev - Jul)';
      case 'custom':
        if (customStartDate && customEndDate) return `${customStartDate} até ${customEndDate}`;
        if (customStartDate) return `A partir de ${customStartDate}`;
        if (customEndDate) return `Até ${customEndDate}`;
        return 'Intervalo Personalizado';
      default:
        return 'Todos os períodos';
    }
  }, [periodFilter, customStartDate, customEndDate]);

  const isTrimesterActive =
    periodFilter === 'trimestre_current' ||
    periodFilter === 'trimestre_1' ||
    periodFilter === 'trimestre_2' ||
    periodFilter === 'trimestre_3';

  const isSemesterActive =
    periodFilter === 'semestre_current' ||
    periodFilter === 'semestre_1' ||
    periodFilter === 'semestre_2';

  const resetFilters = () => {
    setPeriodFilter('all');
    setFilterType('all');
    setSearchQuery('');
    setCustomStartDate('');
    setCustomEndDate('');
    setIsCustomOpen(false);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-xl text-[#0D1B3D]">
            Histórico de Atividades
          </h1>
          <p className="text-xs text-slate-500">
            Registo completo de entradas e saídas de {selectedStudent.name}
          </p>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por data, hora, local ou comprovante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              title="Limpar pesquisa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Section: Period Filter */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-[#143A7B]" />
              <span>Filtrar por Período</span>
            </span>

            {periodFilter !== 'all' && (
              <button
                onClick={() => {
                  setPeriodFilter('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setIsCustomOpen(false);
                }}
                className="text-[11px] text-slate-500 hover:text-[#143A7B] font-medium flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar período</span>
              </button>
            )}
          </div>

          {/* Quick Period Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => {
                setPeriodFilter('all');
                setIsCustomOpen(false);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                periodFilter === 'all'
                  ? 'bg-[#143A7B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => {
                setPeriodFilter('today');
                setIsCustomOpen(false);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                periodFilter === 'today'
                  ? 'bg-[#143A7B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => {
                setPeriodFilter('week');
                setIsCustomOpen(false);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                periodFilter === 'week'
                  ? 'bg-[#143A7B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => {
                setPeriodFilter('month');
                setIsCustomOpen(false);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                periodFilter === 'month'
                  ? 'bg-[#143A7B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => {
                setPeriodFilter('trimestre_current');
                setIsCustomOpen(false);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                isTrimesterActive
                  ? 'bg-[#143A7B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Trimestre
            </button>
            <button
              onClick={() => {
                setPeriodFilter('semestre_current');
                setIsCustomOpen(false);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                isSemesterActive
                  ? 'bg-[#143A7B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semestre
            </button>
            <button
              onClick={() => {
                setPeriodFilter('custom');
                setIsCustomOpen(true);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
                periodFilter === 'custom' || isCustomOpen
                  ? 'bg-[#143A7B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CalendarRange className="w-3 h-3" />
              <span>Personalizado</span>
            </button>
          </div>

          {/* Sub-selector for Trimester: 1º / 2º / 3º */}
          {isTrimesterActive && (
            <div className="flex items-center gap-1.5 p-2 bg-blue-50/70 rounded-xl border border-blue-100 text-xs animate-fade-in overflow-x-auto">
              <span className="text-[11px] font-semibold text-[#143A7B] whitespace-nowrap pl-1">
                Trimestre:
              </span>
              <button
                onClick={() => setPeriodFilter('trimestre_current')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  periodFilter === 'trimestre_current'
                    ? 'bg-[#143A7B] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                Atual
              </button>
              <button
                onClick={() => setPeriodFilter('trimestre_1')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  periodFilter === 'trimestre_1'
                    ? 'bg-[#143A7B] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                1º Trimestre (Set-Dez)
              </button>
              <button
                onClick={() => setPeriodFilter('trimestre_2')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  periodFilter === 'trimestre_2'
                    ? 'bg-[#143A7B] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                2º Trimestre (Jan-Mar)
              </button>
              <button
                onClick={() => setPeriodFilter('trimestre_3')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  periodFilter === 'trimestre_3'
                    ? 'bg-[#143A7B] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                3º Trimestre (Abr-Jul)
              </button>
            </div>
          )}

          {/* Sub-selector for Semester: 1º / 2º */}
          {isSemesterActive && (
            <div className="flex items-center gap-1.5 p-2 bg-blue-50/70 rounded-xl border border-blue-100 text-xs animate-fade-in overflow-x-auto">
              <span className="text-[11px] font-semibold text-[#143A7B] whitespace-nowrap pl-1">
                Semestre:
              </span>
              <button
                onClick={() => setPeriodFilter('semestre_current')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  periodFilter === 'semestre_current'
                    ? 'bg-[#143A7B] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                Atual
              </button>
              <button
                onClick={() => setPeriodFilter('semestre_1')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  periodFilter === 'semestre_1'
                    ? 'bg-[#143A7B] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                1º Semestre (Set-Jan)
              </button>
              <button
                onClick={() => setPeriodFilter('semestre_2')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  periodFilter === 'semestre_2'
                    ? 'bg-[#143A7B] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                2º Semestre (Fev-Jul)
              </button>
            </div>
          )}

          {/* Custom Date Range Picker */}
          {(periodFilter === 'custom' || isCustomOpen) && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value);
                      setPeriodFilter('custom');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value);
                      setPeriodFilter('custom');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
                  />
                </div>
              </div>

              {(customStartDate || customEndDate) && (
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-500">
                    Filtro por datas ativado
                  </span>
                  <button
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="text-[#143A7B] hover:underline font-medium"
                  >
                    Limpar datas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Pills (Todas / Entradas / Saídas) - combined with period counts */}
        <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-[#143A7B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas ({periodFilteredLogs.length})
            </button>
            <button
              onClick={() => setFilterType('entry')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === 'entry'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Entradas ({periodFilteredLogs.filter((l) => l.type === 'entry').length})
            </button>
            <button
              onClick={() => setFilterType('exit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === 'exit'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Saídas ({periodFilteredLogs.filter((l) => l.type === 'exit').length})
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'registo' : 'registos'}
          </span>
        </div>

        {/* Active Filters Summary Bar (if any filter is active) */}
        {(periodFilter !== 'all' || searchQuery.trim() !== '') && (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-600 animate-fade-in">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-400">A mostrar:</span>
              <span className="font-semibold text-[#143A7B] truncate">
                {activePeriodLabel}
              </span>
              {searchQuery.trim() && (
                <span className="text-slate-500 truncate">
                  • busca: &quot;{searchQuery}&quot;
                </span>
              )}
            </div>
            <button
              onClick={resetFilters}
              className="text-[11px] text-slate-500 hover:text-red-600 font-medium flex items-center gap-1 shrink-0 ml-2 transition-colors"
              title="Restaurar todos os filtros"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Repor</span>
            </button>
          </div>
        )}
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-[#143A7B]/40 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      log.type === 'entry'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {log.type === 'entry' ? 'ENTRADA' : 'SAÍDA'}
                  </div>

                  <div>
                    <h3 className="font-['Poppins',sans-serif] font-bold text-sm text-[#0D1B3D]">
                      {log.type === 'entry' ? 'Entrada Confirmada' : 'Saída Registada'}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{log.date}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="font-mono font-semibold text-slate-700">{log.timestamp}</span>
                    </p>
                  </div>
                </div>

                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                  {log.method === 'facial' ? 'Face Scan' : 'Biometria'}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 space-y-1 mb-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{log.location}</span>
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium">Notificado via Push</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  Hash: {log.receiptCode}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedReceiptLog(log)}
                  className="text-xs font-semibold text-[#143A7B] hover:underline flex items-center gap-1.5"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Visualizar Comprovante Rápido</span>
                </button>

                <Link
                  href={`/pai/comprovante?id=${log.id}`}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                  <span>Página Legal</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum registo encontrado</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Nenhuma atividade corresponde aos filtros selecionados para {selectedStudent.name}.
            </p>
            {(periodFilter !== 'all' || filterType !== 'all' || searchQuery.trim() !== '') && (
              <button
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar todos os registos</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
