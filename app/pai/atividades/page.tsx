'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSystem } from '@/lib/context';
import {
  History,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  FileCheck,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

export default function PaiAtividadesPage() {
  const { selectedStudent, logs, setSelectedReceiptLog } = useSystem();
  const [filterType, setFilterType] = useState<'all' | 'entry' | 'exit'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const studentLogs = logs.filter((l) => l.studentId === selectedStudent.id);

  const filteredLogs = studentLogs.filter((log) => {
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

  return (
    <div className="space-y-4 animate-fade-in">
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
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por data, hora ou local..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-[#143A7B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({studentLogs.length})
          </button>
          <button
            onClick={() => setFilterType('entry')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'entry'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Entradas ({studentLogs.filter((l) => l.type === 'entry').length})
          </button>
          <button
            onClick={() => setFilterType('exit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'exit'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Saídas ({studentLogs.filter((l) => l.type === 'exit').length})
          </button>
        </div>
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
                  href={`/pai/comprovante/${log.id}`}
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
            <p className="text-xs text-slate-400 mt-1">
              Tente ajustar os filtros ou a palavra-chave da pesquisa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
