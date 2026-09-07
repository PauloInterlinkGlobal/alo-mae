'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { UserProfile, SchoolClass } from '@/lib/types';
import { getTeachers, enrollTeacherService } from '@/services/users.service';
import { getClasses } from '@/services/classes.service';
import {
  GraduationCap,
  Plus,
  Search,
  School,
  Mail,
  Phone,
  CheckCircle2,
  X,
  Edit2,
  BookOpen,
} from 'lucide-react';

export const ProfessoresTab: React.FC = () => {
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    classIds: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tList, cList] = await Promise.all([
        getTeachers('inst_horizonte_01'),
        getClasses('inst_horizonte_01'),
      ]);
      setTeachers(tList);
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

  function openCreateModal() {
    setEditingTeacher(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      title: 'Docente',
      classIds: [],
    });
    setIsModalOpen(true);
  }

  function openEditModal(t: UserProfile) {
    setEditingTeacher(t);
    setFormData({
      name: t.name,
      email: t.email,
      phone: t.phone || '',
      title: t.title || 'Docente',
      classIds: t.classIds || [],
    });
    setIsModalOpen(true);
  }

  function toggleClass(cId: string) {
    setFormData(prev => {
      const exists = prev.classIds.includes(cId);
      return {
        ...prev,
        classIds: exists
          ? prev.classIds.filter(id => id !== cId)
          : [...prev.classIds, cId],
      };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setIsSaving(true);
    try {
      await enrollTeacherService(
        {
          uid: editingTeacher?.uid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          title: formData.title,
        },
        formData.classIds,
        'inst_horizonte_01'
      );

      showToast(editingTeacher ? 'Docente atualizado com sucesso!' : 'Docente registado (enrollTeacher)!');
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Erro ao guardar docente: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.title || '').toLowerCase().includes(searchTerm.toLowerCase())
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

      {/* Header with Search and Create */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou disciplina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#143A7B] transition-all"
          />
        </div>

        <button
          id="btn-add-teacher"
          onClick={openCreateModal}
          className="bg-[#143A7B] hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Docente (enrollTeacher)</span>
        </button>
      </div>

      {/* Teachers Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-medium bg-white rounded-2xl border border-slate-200">
          A carregar corpo docente...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
          <GraduationCap className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-xs font-semibold text-slate-700">Nenhum docente encontrado</p>
          <p className="text-[11px] text-slate-500">Registe os professores e atribua as respetivas turmas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t) => {
            const assignedClasses = classes.filter(c => (t.classIds || []).includes(c.id));

            return (
              <div
                key={t.uid}
                id={`card-teacher-${t.uid}`}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0">
                        {t.avatarUrl ? (
                          <Image
                            src={t.avatarUrl}
                            alt={t.name}
                            fill
                            sizes="44px"
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold text-sm">
                            {t.name.split(' ').pop()?.[0] || 'P'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 leading-tight">{t.name}</h3>
                        <p className="text-[10px] text-blue-700 font-medium mt-0.5">{t.title || 'Docente'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Editar Docente"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-500 mb-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{t.email}</span>
                    </div>
                    {t.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Turmas Lecionadas ({assignedClasses.length}):
                    </span>
                    {assignedClasses.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedClasses.map((c) => (
                          <span
                            key={c.id}
                            className="bg-blue-50 text-[#143A7B] border border-blue-100 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1"
                          >
                            <School className="w-3 h-3" />
                            {c.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sem turmas atribuídas</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Docente */}
      {isModalOpen && (
        <div className="modal-backdrop fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable w-[95%] max-w-[95vw] sm:max-w-lg my-auto">
            <div className="modal-content bg-white rounded-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
              {/* Modal Header */}
              <div className="modal-header flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      {editingTeacher ? 'Editar Docente' : 'Cadastrar Docente (enrollTeacher)'}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">
                      Registo de professor com atribuição de turmas na escola atual
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                {/* Modal Body */}
                <div className="modal-body p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Prof. Manuel Domingos"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#143A7B]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Institucional *</label>
                      <input
                        type="email"
                        required
                        placeholder="manuel@alo-mae.co.ao"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#143A7B]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone Principal</label>
                      <input
                        type="tel"
                        placeholder="+244 923 000 000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#143A7B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo / Especialidade</label>
                    <input
                      type="text"
                      placeholder="Ex: Coordenador Pedagógico / Matemática"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#143A7B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Turmas Atribuídas (multi-select) *</label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Selecione as turmas que este professor leciona:
                    </p>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1.5 bg-slate-50">
                      {classes.map((c) => {
                        const selected = formData.classIds.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleClass(c.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                              selected
                                ? 'bg-[#143A7B] text-white font-medium'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <School className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">{c.name}</span>
                            </div>
                            <span className="text-[10px] opacity-80 shrink-0">{c.studentCount || 0} alunos</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl text-xs font-semibold bg-[#143A7B] text-white hover:bg-blue-800 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isSaving ? 'A registar...' : editingTeacher ? 'Atualizar Docente' : 'Concluir Registo (enrollTeacher)'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
