'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { UserProfile, Student, SchoolClass } from '@/lib/types';
import { getParents, updateParentContact } from '@/services/users.service';
import { getStudents } from '@/services/students.service';
import { getClasses } from '@/services/classes.service';
import {
  Users,
  Search,
  Mail,
  Phone,
  Edit2,
  CheckCircle2,
  X,
  Building2,
  Lock,
  Info,
  ExternalLink,
} from 'lucide-react';

export const PaisTab: React.FC = () => {
  const [parents, setParents] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    avatarUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const currentSchoolId = 'inst_horizonte_01';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [pList, sList, cList] = await Promise.all([
        getParents(currentSchoolId),
        getStudents(currentSchoolId),
        getClasses(currentSchoolId),
      ]);
      setParents(pList);
      setStudents(sList);
      setClasses(cList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  function openEditModal(p: UserProfile) {
    setEditingParent(p);
    setFormData({
      name: p.name,
      phone: p.phone || '',
      avatarUrl: p.avatarUrl || '',
    });
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingParent || !formData.name.trim()) return;

    setIsSaving(true);
    try {
      await updateParentContact(editingParent.uid, {
        name: formData.name,
        phone: formData.phone,
        avatarUrl: formData.avatarUrl,
      });

      showToast('Dados de contacto atualizados com sucesso!');
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Erro ao atualizar encarregado: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const filtered = parents.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#0D1B3D] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-blue-400/30 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-[#143A7B] text-white shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-700">
          <p className="font-bold text-slate-900 mb-0.5">Ecrã de Consulta de Encarregados de Educação (Regra RBAC)</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Aqui são listados os pais com acesso ao Alô Mãe. Educandos de outras escolas aparecem apenas como badges informativos.
            <strong> A lista de educandos não pode ser manipulada diretamente aqui</strong> — toda a vinculação pai↔filho é gerida
            exclusivamente através do ecrã de Alunos (evitando dessincronização de <code>studentIds</code> nas Custom Claims).
          </p>
        </div>
      </div>

      {/* Search Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou telefone do encarregado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#143A7B] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Users className="w-4 h-4 text-slate-400" />
          <span>Total de Encarregados: <strong>{parents.length}</strong></span>
        </div>
      </div>

      {/* Parents Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-medium bg-white rounded-2xl border border-slate-200">
          A carregar encarregados de educação...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
          <Users className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-xs font-semibold text-slate-700">Nenhum encarregado encontrado</p>
          <p className="text-[11px] text-slate-500">Os encarregados são cadastrados automaticamente ao matricular novos alunos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((p) => {
            const rawStudentIds = p.studentIds || [];
            // Alunos desta escola
            const localStudents = students.filter(s =>
              rawStudentIds.includes(s.id) ||
              s.parentUid === p.uid ||
              (s.parentEmail && s.parentEmail.toLowerCase() === p.email.toLowerCase())
            );

            // Educandos de outras escolas (ids que não estão nos students locais)
            const otherSchoolIds = (p as any).schoolIds || [];
            const hasOtherSchools = otherSchoolIds.some((id: string) => id !== currentSchoolId);
            const otherChildrenCount = Math.max(0, rawStudentIds.length - localStudents.length);

            return (
              <div
                key={p.uid}
                id={`card-parent-${p.uid}`}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0">
                        {p.avatarUrl ? (
                          <Image
                            src={p.avatarUrl}
                            alt={p.name}
                            fill
                            sizes="44px"
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-700 font-bold text-sm">
                            {(p.name || 'P')[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-900 leading-tight">{p.name}</h3>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded-full">
                            Encarregado
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">UID: {p.uid}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => openEditModal(p)}
                      className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                      title="Editar apenas dados de contacto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Editar Contacto</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 mb-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{p.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{p.phone || 'Sem telefone'}</span>
                    </div>
                  </div>

                  {/* Filhos nesta escola destacados */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#143A7B]" />
                        Educando(s) Nesta Escola ({localStudents.length}):
                      </span>
                    </div>

                    {localStudents.length > 0 ? (
                      <div className="space-y-2">
                        {localStudents.map((st) => {
                          const targetClass = classes.find(c => c.id === st.classId);
                          const className = targetClass ? targetClass.name : st.className || 'Turma Atribuída';

                          return (
                            <div
                              key={st.id}
                              className="bg-blue-50/60 border border-blue-100/80 rounded-xl p-2.5 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-white border border-blue-200 overflow-hidden relative shrink-0">
                                  {st.photoUrl ? (
                                    <Image
                                      src={st.photoUrl}
                                      alt={st.name || 'Aluno'}
                                      fill
                                      sizes="28px"
                                      className="object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-blue-700">
                                      {(st.name || 'A')[0]}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900 leading-tight">{st.name}</p>
                                  <p className="text-[10px] text-blue-700 font-medium">{className} • Matrícula: {st.matricula}</p>
                                </div>
                              </div>

                              <span className="text-[9px] font-bold text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                                Matriculado
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Nenhum educando ativo nesta escola.</p>
                    )}

                    {/* Badge informativo de outras escolas */}
                    {(hasOtherSchools || otherChildrenCount > 0) && (
                      <div className="mt-3 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between text-[10px] text-amber-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            <strong>Perfil Multi-Escola:</strong> Possui {otherChildrenCount > 0 ? `${otherChildrenCount} educando(s)` : 'vínculo'} noutra instituição de ensino.
                          </span>
                        </div>
                        <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[9px] shrink-0 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Apenas Leitura
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Editar Apenas Contactos */}
      {isModalOpen && editingParent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Editar Dados de Contacto
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Encarregado: {editingParent.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção de Segurança:</strong> Não é permitido alterar a lista de educandos ou escolas por esta via.
                  Para vincular ou matricular um aluno, utilize o módulo de <strong>Alunos</strong>.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#143A7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone Principal</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#143A7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL da Foto de Perfil</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#143A7B]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#143A7B] text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {isSaving ? 'A atualizar...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
