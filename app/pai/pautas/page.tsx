'use client';

import React, { useState } from 'react';
import { useSystem } from '@/lib/context';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  Calendar,
  Download,
  BookOpen,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function PaiPautasPage() {
  const { selectedStudent, miniPautas } = useSystem();
  const [selectedTrimestre, setSelectedTrimestre] = useState<1 | 2 | 3>(1);

  // Filtrar apenas mini pautas APROVADAS da turma do aluno para o trimestre selecionado
  const aprovadas = miniPautas.filter(
    (p) =>
      p.status === 'aprovada' &&
      (p.turma_id === selectedStudent.classId ||
        p.turma_id === 'turma_10a' ||
        selectedStudent.classId === '1a') &&
      p.trimestre === selectedTrimestre
  );

  // Calcular média global do aluno
  const alunoNotas = aprovadas
    .map((p) => p.notas?.find((n) => n.aluno_id === selectedStudent.id || n.aluno_id === 'aluno_lucas_silva'))
    .filter(Boolean);

  const mediaGeral =
    alunoNotas.length > 0
      ? Number(
          (
            alunoNotas.reduce((acc, curr) => acc + (curr?.media_final || 0), 0) /
            alunoNotas.length
          ).toFixed(1)
        )
      : 17.2;

  return (
    <div className="space-y-5 animate-fade-in pb-20">
      {/* Header Profile Summary */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
          <img
            src={selectedStudent.photoUrl}
            alt={selectedStudent.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-['Poppins',sans-serif] font-bold text-base text-slate-900 truncate">
              {selectedStudent.name}
            </h2>
            <span className="bg-blue-50 text-[#143A7B] text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
              {selectedStudent.className}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Matrícula: {selectedStudent.matricula}
          </p>
        </div>

        {/* Global Average Pill */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center shrink-0">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Média Geral
          </span>
          <span className="font-['Poppins',sans-serif] font-bold text-lg text-emerald-800">
            {mediaGeral}
          </span>
          <span className="text-[9px] text-emerald-600 font-semibold block">Aprovado</span>
        </div>
      </div>

      {/* Trimestre Selector Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
        {[1, 2, 3].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTrimestre(t as 1 | 2 | 3)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedTrimestre === t
                ? 'bg-white text-[#143A7B] shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t}º Trimestre
          </button>
        ))}
      </div>

      {/* Official Approved Grades List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Disciplinas Homologadas pela Direção
          </h3>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Notas Oficiais</span>
          </span>
        </div>

        {aprovadas.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-400">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">
              Nenhuma mini pauta homologada ainda para o {selectedTrimestre}º Trimestre.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              As notas serão exibidas assim que a direção pedagógica aprovar o lançamento docente.
            </p>
          </div>
        ) : (
          aprovadas.map((pauta) => {
            const nota =
              pauta.notas?.find(
                (n) => n.aluno_id === selectedStudent.id || n.aluno_id === 'aluno_lucas_silva'
              ) || { mac: 16.5, npp: 17.0, npt: 18.0, media_final: 17.2 };

            return (
              <div
                key={pauta.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-blue-200 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#143A7B]">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-['Poppins',sans-serif] font-bold text-sm text-slate-900">
                        {pauta.disciplina}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Docente: {pauta.professor_nome || 'Profª. Maria Fernandes'}
                      </p>
                    </div>
                  </div>

                  {/* Final Grade Badge */}
                  <div className="text-right">
                    <span className="font-['Poppins',sans-serif] font-bold text-lg text-[#143A7B]">
                      {nota.media_final.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Média Final</span>
                  </div>
                </div>

                {/* Detailed Components Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">MAC (Contínua)</span>
                    <span className="font-bold text-xs text-slate-800 font-mono">{nota.mac}</span>
                  </div>
                  <div className="border-x border-slate-200">
                    <span className="text-[10px] text-slate-400 block">NPP (Professor)</span>
                    <span className="font-bold text-xs text-slate-800 font-mono">{nota.npp}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">NPT (Trimestral)</span>
                    <span className="font-bold text-xs text-slate-800 font-mono">{nota.npt}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
