'use client';

import React, { useState } from 'react';
import { useSystem } from '@/lib/context';
import { MiniPauta } from '@/lib/types';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Send,
  BookOpen,
  UserCheck,
  Building2,
} from 'lucide-react';

export default function AdminMiniPautasPage() {
  const { miniPautas, aprovarPauta, rejeitarPauta } = useSystem();
  const [statusFilter, setStatusFilter] = useState<'all' | 'submetida' | 'aprovada' | 'rascunho' | 'rejeitada'>('all');
  const [selectedPauta, setSelectedPauta] = useState<MiniPauta | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState<boolean>(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState<string>('');

  const filteredPautas = miniPautas.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const handleApprove = async (pauta: MiniPauta) => {
    await aprovarPauta(pauta.id);
    if (selectedPauta?.id === pauta.id) {
      setSelectedPauta({ ...selectedPauta, status: 'aprovada' });
    }
  };

  const handleOpenReject = (pauta: MiniPauta) => {
    setSelectedPauta(pauta);
    setMotivoRejeicao('');
    setRejectionModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedPauta) return;
    await rejeitarPauta(selectedPauta.id, motivoRejeicao.trim() || 'Ajustar notas conforme orientações da coordenação pedagógica.');
    setRejectionModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl text-[#0D1B3D]">
            Homologação & Aprovação de Mini Pautas
          </h1>
          <p className="text-sm text-slate-500">
            Validação pedagógica e liberação das notas trimestrais para os encarregados de educação.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-[#143A7B] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todas ({miniPautas.length})
          </button>
          <button
            onClick={() => setStatusFilter('submetida')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'submetida'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Pendentes ({miniPautas.filter((p) => p.status === 'submetida').length})
          </button>
          <button
            onClick={() => setStatusFilter('aprovada')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'aprovada'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Aprovadas ({miniPautas.filter((p) => p.status === 'aprovada').length})
          </button>
        </div>
      </div>

      {/* Grid of Pautas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPautas.map((pauta) => (
          <div
            key={pauta.id}
            className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header card */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-bold text-[#143A7B] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {pauta.turma_nome || pauta.turma_id}
                </span>

                {pauta.status === 'aprovada' && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Aprovada</span>
                  </span>
                )}
                {pauta.status === 'submetida' && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Submetida (Pendente)</span>
                  </span>
                )}
                {pauta.status === 'rejeitada' && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span>Rejeitada</span>
                  </span>
                )}
                {pauta.status === 'rascunho' && (
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-500" />
                    <span>Rascunho</span>
                  </span>
                )}
              </div>

              {/* Title & Info */}
              <h3 className="font-['Poppins',sans-serif] font-bold text-lg text-slate-900 mb-1">
                {pauta.disciplina}
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                {pauta.trimestre}º Trimestre • Ano Lectivo {pauta.ano_lectivo}
              </p>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Docente Responsável:</span>
                  <span className="font-semibold text-slate-800">{pauta.professor_nome || 'Docente'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Alunos Avaliados:</span>
                  <span className="font-semibold text-slate-800">{pauta.notas?.length || 0} alunos</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => setSelectedPauta(pauta)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver Notas</span>
              </button>

              {pauta.status === 'submetida' && (
                <>
                  <button
                    onClick={() => handleApprove(pauta)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1 shadow-xs"
                    title="Aprovar Pauta"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aprovar</span>
                  </button>
                  <button
                    onClick={() => handleOpenReject(pauta)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold py-2 px-2.5 rounded-xl transition-all"
                    title="Rejeitar / Solicitar Ajustes"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedPauta && !rejectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-[#0D1B3D] text-white flex items-center justify-between">
              <div>
                <h3 className="font-['Poppins',sans-serif] font-bold text-lg">
                  {selectedPauta.disciplina} — {selectedPauta.turma_nome || selectedPauta.turma_id}
                </h3>
                <p className="text-xs text-blue-200">
                  {selectedPauta.trimestre}º Trimestre • Professor: {selectedPauta.professor_nome || 'Docente'}
                </p>
              </div>
              <button
                onClick={() => setSelectedPauta(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Aluno</th>
                    <th className="px-3 py-3 text-center">MAC</th>
                    <th className="px-3 py-3 text-center">NPP</th>
                    <th className="px-3 py-3 text-center">NPT</th>
                    <th className="px-4 py-3 text-center">Média Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPauta.notas?.map((n) => (
                    <tr key={n.aluno_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {n.aluno_nome || n.aluno_id}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-slate-700">{n.mac}</td>
                      <td className="px-3 py-3 text-center font-mono text-slate-700">{n.npp}</td>
                      <td className="px-3 py-3 text-center font-mono text-slate-700">{n.npt}</td>
                      <td className="px-4 py-3 text-center font-bold font-mono">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg ${
                            n.media_final >= 10
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {n.media_final.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedPauta(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Fechar
              </button>

              {selectedPauta.status === 'submetida' && (
                <>
                  <button
                    onClick={() => handleOpenReject(selectedPauta)}
                    className="px-4 py-2 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100"
                  >
                    Rejeitar / Ajustes
                  </button>
                  <button
                    onClick={() => handleApprove(selectedPauta)}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm"
                  >
                    Homologar & Publicar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModalOpen && selectedPauta && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-['Poppins',sans-serif] font-bold text-lg text-slate-900 mb-1">
              Devolver Mini Pauta para Correção
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Indique o motivo pedagógico ou os campos que o docente precisará ajustar.
            </p>

            <textarea
              rows={3}
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="Ex: Verificar notas da Prova Trimestral (NPT) do aluno Lucas Silva..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-sm"
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
