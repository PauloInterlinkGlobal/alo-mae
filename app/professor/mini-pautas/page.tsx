'use client';

import React, { useState } from 'react';
import { useSystem } from '@/lib/context';
import { MiniPauta, NotaAluno } from '@/lib/types';
import {
  FileText,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Sparkles,
  BookOpen,
  UserCheck,
  RotateCcw,
} from 'lucide-react';

export default function ProfessorMiniPautasPage() {
  const {
    currentUser,
    alunos,
    turmas,
    turmasProfessores,
    miniPautas,
    salvarNotas,
    submeterPauta,
    criarMiniPauta,
  } = useSystem();

  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('turma_10a');
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>('Matemática');
  const [selectedTrimestre, setSelectedTrimestre] = useState<1 | 2 | 3>(1);

  // Active Pauta filter
  const activePauta = miniPautas.find(
    (p) =>
      p.turma_id === selectedTurmaId &&
      p.disciplina.toLowerCase() === selectedDisciplina.toLowerCase() &&
      p.trimestre === selectedTrimestre
  );

  // Alunos da turma selecionada
  const turmaAlunos = React.useMemo(
    () => alunos.filter((a) => a.turma_id === selectedTurmaId),
    [alunos, selectedTurmaId]
  );

  // Estado local para edição rápida de notas (modificações sobrepostas)
  const [editedNotas, setEditedNotas] = useState<Record<string, { mac: number; npp: number; npt: number }>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Determinar notas correntes baseadas na pauta do Firestore ou padrão
  const getAlunoGrade = React.useCallback(
    (alunoId: string) => {
      if (editedNotas[alunoId]) {
        return editedNotas[alunoId];
      }
      if (activePauta && activePauta.notas) {
        const found = activePauta.notas.find((n) => n.aluno_id === alunoId);
        if (found) {
          return { mac: found.mac, npp: found.npp, npt: found.npt };
        }
      }
      return { mac: 14, npp: 15, npt: 16 };
    },
    [editedNotas, activePauta]
  );

  const handleGradeChange = (alunoId: string, field: 'mac' | 'npp' | 'npt', val: number) => {
    const clamped = Math.max(0, Math.min(20, isNaN(val) ? 0 : val));
    const current = getAlunoGrade(alunoId);
    setEditedNotas((prev) => ({
      ...prev,
      [alunoId]: {
        ...current,
        [field]: clamped,
      },
    }));
  };

  const calculateMedia = (mac: number, npp: number, npt: number): number => {
    const avg = (mac + npp + npt) / 3;
    return Number(avg.toFixed(1));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const notasPayload: NotaAluno[] = turmaAlunos.map((aluno) => {
        const grades = getAlunoGrade(aluno.id);
        return {
          aluno_id: aluno.id,
          aluno_nome: aluno.nome_completo,
          mac: grades.mac,
          npp: grades.npp,
          npt: grades.npt,
          media_final: calculateMedia(grades.mac, grades.npp, grades.npt),
        };
      });

      if (!activePauta) {
        await criarMiniPauta({
          turma_id: selectedTurmaId,
          turma_nome: turmas.find((t) => t.id === selectedTurmaId)?.nome || '10ª Classe A',
          disciplina: selectedDisciplina,
          professor_id: currentUser?.uid || 'user_prof_maria',
          professor_nome: currentUser?.name || 'Profª. Maria Fernandes',
          trimestre: selectedTrimestre,
          ano_lectivo: 2026,
          notas: notasPayload,
        });
      } else {
        await salvarNotas(activePauta.id, notasPayload);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitPauta = async () => {
    if (!activePauta) {
      await handleSaveDraft();
    }
    if (activePauta) {
      await submeterPauta(activePauta.id);
    }
  };

  const canEdit = !activePauta || activePauta.status === 'rascunho' || activePauta.status === 'rejeitada';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl text-[#0D1B3D]">
            Gestão de Mini Pautas Trimestrais
          </h1>
          <p className="text-sm text-slate-500">
            Lançamento de Avaliação Contínua (MAC), Prova do Professor (NPP) e Prova Trimestral (NPT).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={!canEdit || isSaving}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-[#143A7B]" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Rascunho'}</span>
          </button>

          <button
            onClick={handleSubmitPauta}
            disabled={!canEdit}
            className="inline-flex items-center gap-2 bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Submeter à Direção</span>
          </button>
        </div>
      </div>

      {/* Selector Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Turma */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Turma</label>
          <select
            value={selectedTurmaId}
            onChange={(e) => setSelectedTurmaId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#143A7B]"
          >
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} ({t.sala || 'Sala'})
              </option>
            ))}
          </select>
        </div>

        {/* Disciplina */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Disciplina</label>
          <select
            value={selectedDisciplina}
            onChange={(e) => setSelectedDisciplina(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#143A7B]"
          >
            <option value="Matemática">Matemática</option>
            <option value="Física">Física</option>
            <option value="Língua Portuguesa">Língua Portuguesa</option>
            <option value="Química">Química</option>
          </select>
        </div>

        {/* Trimestre */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Trimestre</label>
          <select
            value={selectedTrimestre}
            onChange={(e) => setSelectedTrimestre(Number(e.target.value) as 1 | 2 | 3)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#143A7B]"
          >
            <option value={1}>1º Trimestre (2026)</option>
            <option value={2}>2º Trimestre (2026)</option>
            <option value={3}>3º Trimestre (2026)</option>
          </select>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#143A7B] rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">
                {selectedDisciplina} — {selectedTrimestre}º Trimestre
              </span>
              {/* Status Badge */}
              {activePauta?.status === 'aprovada' && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Aprovada pela Direção</span>
                </span>
              )}
              {activePauta?.status === 'submetida' && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>Em Revisão na Direção</span>
                </span>
              )}
              {activePauta?.status === 'rejeitada' && (
                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>Rejeitada para Ajustes</span>
                </span>
              )}
              {(!activePauta || activePauta.status === 'rascunho') && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span>Rascunho do Professor</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ano Lectivo 2026 • {turmaAlunos.length} Alunos Listados
            </p>
          </div>
        </div>

        {activePauta?.motivo_rejeicao && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Nota da Direção: {activePauta.motivo_rejeicao}</span>
          </div>
        )}
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Aluno(a)</th>
                <th className="px-4 py-4 text-center">MAC (0-20)</th>
                <th className="px-4 py-4 text-center">NPP (0-20)</th>
                <th className="px-4 py-4 text-center">NPT (0-20)</th>
                <th className="px-6 py-4 text-center">Média Final</th>
                <th className="px-6 py-4 text-center">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {turmaAlunos.map((aluno) => {
                const grades = getAlunoGrade(aluno.id);
                const media = calculateMedia(grades.mac, grades.npp, grades.npt);
                const isApproved = media >= 10.0;

                return (
                  <tr key={aluno.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Aluno info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                          <img
                            src={aluno.foto_biometrica_url}
                            alt={aluno.nome_completo}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">
                            {aluno.nome_completo}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {aluno.matricula || aluno.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* MAC */}
                    <td className="px-4 py-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        disabled={!canEdit}
                        value={grades.mac}
                        onChange={(e) =>
                          handleGradeChange(aluno.id, 'mac', parseFloat(e.target.value))
                        }
                        className="w-16 text-center font-bold font-mono py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#143A7B] disabled:bg-slate-100"
                      />
                    </td>

                    {/* NPP */}
                    <td className="px-4 py-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        disabled={!canEdit}
                        value={grades.npp}
                        onChange={(e) =>
                          handleGradeChange(aluno.id, 'npp', parseFloat(e.target.value))
                        }
                        className="w-16 text-center font-bold font-mono py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#143A7B] disabled:bg-slate-100"
                      />
                    </td>

                    {/* NPT */}
                    <td className="px-4 py-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        disabled={!canEdit}
                        value={grades.npt}
                        onChange={(e) =>
                          handleGradeChange(aluno.id, 'npt', parseFloat(e.target.value))
                        }
                        className="w-16 text-center font-bold font-mono py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#143A7B] disabled:bg-slate-100"
                      />
                    </td>

                    {/* Media Final */}
                    <td className="px-6 py-4 text-center font-bold font-mono text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-xl ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {media.toFixed(1)} val
                      </span>
                    </td>

                    {/* Resultado */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          isApproved ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isApproved ? 'Apto / Positivo' : 'Não Apto'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
