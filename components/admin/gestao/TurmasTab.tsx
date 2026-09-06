'use client';

import React, { useState, useEffect } from 'react';
import { SchoolClass, UserProfile } from '@/lib/types';
import { getClasses, createClass, updateClass, deleteClass } from '@/services/classes.service';
import { getTeachers } from '@/services/users.service';
import {
  School,
  Plus,
  Edit2,
  Trash2,
  Users,
  GraduationCap,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react';

export const TurmasTab: React.FC = () => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    teacherIds: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [classList, teacherList] = await Promise.all([
        getClasses('inst_horizonte_01'),
        getTeachers('inst_horizonte_01'),
      ]);
      setClasses(classList);
      setTeachers(teacherList);
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
    setEditingClass(null);
    setFormData({ name: '', teacherIds: [] });
    setIsModalOpen(true);
  }

  function openEditModal(c: SchoolClass) {
    setEditingClass(c);
    setFormData({
      name: c.name,
      teacherIds: c.teacherIds || [],
    });
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      if (editingClass) {
        await updateClass(editingClass.id, {
          name: formData.name.trim(),
          teacherIds: formData.teacherIds,
        });
        showToast('Turma atualizada com sucesso!');
      } else {
        await createClass({
          name: formData.name.trim(),
          schoolId: 'inst_horizonte_01',
          teacherIds: formData.teacherIds,
        });
        showToast('Nova turma registada com sucesso!');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Erro ao guardar turma: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(classId: string, name: string) {
    if (!confirm(`Tem a certeza que deseja eliminar a turma "${name}"?`)) return;
    try {
      await deleteClass(classId);
      showToast('Turma removida.');
      await loadData();
    } catch (err: any) {
      alert('Erro ao eliminar turma: ' + err.message);
    }
  }

  function toggleTeacher(tUid: string) {
    setFormData(prev => {
      const exists = prev.teacherIds.includes(tUid);
      return {
        ...prev,
        teacherIds: exists
          ? prev.teacherIds.filter(id => id !== tUid)
          : [...prev.teacherIds, tUid],
      };
    });
  }

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
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
            placeholder="Pesquisar por nome da turma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#143A7B] focus:border-transparent transition-all"
          />
        </div>

        <button
          id="btn-add-turma"
          onClick={openCreateModal}
          className="bg-[#143A7B] hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nova Turma</span>
        </button>
      </div>

      {/* Grid of Classes */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-medium bg-white rounded-2xl border border-slate-200">
          A carregar turmas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
          <School className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-xs font-semibold text-slate-700">Nenhuma turma encontrada</p>
          <p className="text-[11px] text-slate-500">Crie a primeira turma para começar a matricular alunos e associar professores.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => {
            const assignedTeacherNames = teachers
              .filter(t => (c.teacherIds || []).includes(t.uid))
              .map(t => t.name);

            return (
              <div
                key={c.id}
                id={`card-class-${c.id}`}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#143A7B] flex items-center justify-center shrink-0">
                      <School className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-2 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar Turma"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar Turma"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1">{c.name}</h3>
                  <p className="text-[11px] text-slate-400 mb-4">ID Mestre: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{c.id}</code></p>

                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        Alunos Matriculados:
                      </span>
                      <span className="font-bold text-slate-900 bg-blue-50 px-2 py-0.5 rounded-full text-[11px] text-blue-700">
                        {c.studentCount || 0} alunos
                      </span>
                    </div>

                    <div className="text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1.5 mb-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                        Docentes Atribuídos ({assignedTeacherNames.length}):
                      </span>
                      {assignedTeacherNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {assignedTeacherNames.map((name, i) => (
                            <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Nenhum professor associado</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Turma */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-[#143A7B]">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingClass ? 'Editar Turma' : 'Criar Nova Turma'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Entidade mestre de turmas (classes) do Alô Mãe
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome da Turma *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 1º Ano A - Manhã, 7ª Classe B..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#143A7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Professores Atribuídos
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Selecione os docentes que lecionam nesta turma:
                </p>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1.5 bg-slate-50">
                  {teachers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 p-2 text-center">Nenhum professor cadastrado ainda.</p>
                  ) : (
                    teachers.map((t) => {
                      const selected = formData.teacherIds.includes(t.uid);
                      return (
                        <div
                          key={t.uid}
                          onClick={() => toggleTeacher(t.uid)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                            selected
                              ? 'bg-[#143A7B] text-white font-medium'
                              : 'bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            <span>{t.name}</span>
                          </div>
                          <span className="text-[10px] opacity-80">{t.title || 'Docente'}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#143A7B] text-white hover:bg-blue-800 transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSaving ? 'A guardar...' : editingClass ? 'Atualizar Turma' : 'Registar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
