'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Student, SchoolClass } from '@/lib/types';
import { getStudents, enrollStudentService, searchParentByContact, deleteStudent } from '@/services/students.service';
import { getClasses } from '@/services/classes.service';
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  Fingerprint,
  Phone,
  Mail,
  UserCheck,
  CheckCircle2,
  X,
  AlertCircle,
  RefreshCw,
  Trash2,
  Building2,
  Sparkles,
} from 'lucide-react';

export const AlunosTab: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State
  const [studentForm, setStudentForm] = useState({
    name: '',
    matricula: '',
    classId: '',
    photoUrl: '',
    biometricCode: '',
    insurancePolicyId: 'SEG-ALO-2024-8821',
  });

  // Encarregado Search & State
  const [parentSearchInput, setParentSearchInput] = useState('');
  const [isSearchingParent, setIsSearchingParent] = useState(false);
  const [foundParent, setFoundParent] = useState<{
    uid: string;
    name: string;
    email: string;
    phone: string;
    studentIds?: string[];
    schoolIds?: string[];
  } | null>(null);

  const [newParentForm, setNewParentForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [stList, clList] = await Promise.all([
        getStudents('inst_horizonte_01'),
        getClasses('inst_horizonte_01'),
      ]);
      setStudents(stList);
      setClasses(clList);
      if (clList.length > 0 && !studentForm.classId) {
        setStudentForm(prev => ({ ...prev, classId: clList[0].id }));
      }
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

  function generateBiometricCode(name: string) {
    const cleanFirstName = (name.split(' ')[0] || 'ALUNO').toUpperCase().replace(/[^A-Z]/g, '');
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `BIO-FACIAL-${randomNum}-${cleanFirstName}`;
  }

  function openEnrollModal() {
    const defaultBio = generateBiometricCode('ALUNO');
    setStudentForm({
      name: '',
      matricula: `2026-${Math.floor(10000 + Math.random() * 90000)}`,
      classId: classes[0]?.id || '',
      photoUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&auto=format&fit=crop&q=80',
      biometricCode: defaultBio,
      insurancePolicyId: 'SEG-ALO-2024-8821',
    });
    setParentSearchInput('');
    setFoundParent(null);
    setNewParentForm({ name: '', email: '', phone: '' });
    setIsModalOpen(true);
  }

  async function handleSearchParent() {
    if (!parentSearchInput.trim()) return;
    setIsSearchingParent(true);
    try {
      const result = await searchParentByContact(parentSearchInput);
      setFoundParent(result);
      if (!result) {
        // Pre-fill email/phone if typed
        if (parentSearchInput.includes('@')) {
          setNewParentForm(p => ({ ...p, email: parentSearchInput.trim() }));
        } else {
          setNewParentForm(p => ({ ...p, phone: parentSearchInput.trim() }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingParent(false);
    }
  }

  async function handleEnrollSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!studentForm.name.trim() || !studentForm.matricula.trim() || !studentForm.classId) {
      alert('Por favor, preencha os dados obrigatórios do aluno.');
      return;
    }

    // Determine parent payload
    let parentPayload: { uid?: string; name: string; email: string; phone: string };

    if (foundParent) {
      parentPayload = {
        uid: foundParent.uid,
        name: foundParent.name,
        email: foundParent.email,
        phone: foundParent.phone,
      };
    } else {
      if (!newParentForm.name.trim() || !newParentForm.email.trim() || !newParentForm.phone.trim()) {
        alert('Por favor, preencha o Nome, Email e Telefone do Encarregado de Educação.');
        return;
      }
      parentPayload = {
        name: newParentForm.name.trim(),
        email: newParentForm.email.trim(),
        phone: newParentForm.phone.trim(),
      };
    }

    setIsSaving(true);
    try {
      await enrollStudentService({
        student: {
          matricula: studentForm.matricula,
          name: studentForm.name,
          classId: studentForm.classId,
          photoUrl: studentForm.photoUrl,
          biometricCode: studentForm.biometricCode,
          insurancePolicyId: studentForm.insurancePolicyId,
        },
        parent: parentPayload,
        schoolId: 'inst_horizonte_01',
      });

      showToast(`Aluno ${studentForm.name} matriculado com sucesso!`);
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Erro na matrícula: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteStudent(id: string, name: string, classId?: string) {
    if (!confirm(`Deseja cancelar a matrícula e remover o aluno "${name}"?`)) return;
    try {
      await deleteStudent(id, classId);
      showToast('Matrícula removida com sucesso.');
      await loadData();
    } catch (err: any) {
      alert('Erro ao remover aluno: ' + err.message);
    }
  }

  const filtered = students.filter(s => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.matricula || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.className || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass =
      selectedClassFilter === 'all' || s.classId === selectedClassFilter;

    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#0D1B3D] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-blue-400/30 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome, matrícula ou encarregado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#143A7B] transition-all"
            />
          </div>

          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#143A7B]"
          >
            <option value="all">Todas as Turmas ({students.length})</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          id="btn-enroll-student"
          onClick={openEnrollModal}
          className="bg-[#143A7B] hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Matricular Aluno (enrollStudent)</span>
        </button>
      </div>

      {/* Students List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-medium bg-white rounded-2xl border border-slate-200">
          A carregar alunos matriculados...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
          <Users className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-xs font-semibold text-slate-700">Nenhum aluno encontrado</p>
          <p className="text-[11px] text-slate-500">Registe uma nova matrícula para ativar a monitorização e controlo biométrico.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Aluno & Matrícula</th>
                  <th className="py-3.5 px-4">Turma Atribuída</th>
                  <th className="py-3.5 px-4">Encarregado de Educação</th>
                  <th className="py-3.5 px-4">Código Biométrico</th>
                  <th className="py-3.5 px-4">Guia / Apólice</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const targetClass = classes.find(c => c.id === s.classId);
                  const className = targetClass ? targetClass.name : s.className || 'Turma Não Atribuída';

                  return (
                    <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                            {s.photoUrl ? (
                              <Image
                                src={s.photoUrl}
                                alt={s.name || 'Aluno'}
                                fill
                                sizes="36px"
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs">
                                {(s.name || 'A')[0]}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{s.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Matrícula: {s.matricula}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-blue-100">
                          {className}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-medium text-slate-800">{s.parentName || 'Encarregado Vinculado'}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                            {s.parentPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{s.parentPhone}</span>}
                            {s.parentEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{s.parentEmail}</span>}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded-md max-w-fit">
                          <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{s.biometricCode || 'NÃO ATIVADO'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/60 max-w-fit">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{s.insurancePolicyId || 'SEG-ALO-2024'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteStudent(s.id, s.name || '', s.classId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover Matrícula"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Matricular Aluno (enrollStudent) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-[#143A7B]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nova Matrícula Escolar (enrollStudent)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Registo unificado de aluno, biometria e vinculação do encarregado
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

            <form onSubmit={handleEnrollSubmit} className="mt-5 space-y-6">
              {/* Secção 1: Dados do Aluno */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#143A7B]" />
                  1. Dados do Aluno
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nome Completo do Aluno *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Lucas Kiala Silva"
                      value={studentForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudentForm(prev => ({
                          ...prev,
                          name: val,
                          biometricCode: generateBiometricCode(val),
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#143A7B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nº de Matrícula *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 2026-00892"
                      value={studentForm.matricula}
                      onChange={(e) => setStudentForm({ ...studentForm, matricula: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-[#143A7B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Turma Atribuída (classes) *</label>
                    <select
                      required
                      value={studentForm.classId}
                      onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#143A7B]"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.studentCount || 0} alunos)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Apólice de Seguro Escolar 24h</label>
                    <select
                      value={studentForm.insurancePolicyId}
                      onChange={(e) => setStudentForm({ ...studentForm, insurancePolicyId: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#143A7B]"
                    >
                      <option value="SEG-ALO-2024-8821">ENSA - Cobertura Escolar Total 24h (Plano A)</option>
                      <option value="SEG-ALO-2024-5510">Sanlam Angola - Seguro de Acidentes Pessoais</option>
                      <option value="SEG-ALO-2024-3320">Fidelidade - Guia Médica Hospitalar</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">URL da Foto Facial (Biometria)</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={studentForm.photoUrl}
                      onChange={(e) => setStudentForm({ ...studentForm, photoUrl: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#143A7B]"
                    />
                  </div>

                  {/* Código Biométrico Read-Only */}
                  <div className="md:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                        <Fingerprint className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-800">Token Biométrico Gerado (Read-Only)</span>
                        <p className="text-[10px] text-slate-500">
                          Código gerado pelo sistema para o quiosque; nunca editável manualmente.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                        {studentForm.biometricCode || 'GERAR CÓDIGO'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setStudentForm(prev => ({ ...prev, biometricCode: generateBiometricCode(prev.name || 'ALUNO') }))}
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-white rounded-lg transition-colors border border-slate-200"
                        title="Regenerar Token"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secção 2: Encarregado de Educação */}
              <div className="pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    2. Encarregado de Educação (Pesquisa & Vinculação)
                  </h4>
                  <span className="text-[10px] text-slate-400">Regra de ouro: Vinculação feita sempre a partir do aluno</span>
                </div>

                {/* Search Box */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-3.5 space-y-2">
                  <p className="text-[11px] text-slate-600">
                    Pesquise pelo <strong>Email</strong> ou <strong>Telefone</strong> do encarregado para verificar se já possui conta (mesmo noutra escola):
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: fernanda.silva@email.com ou +244 923 884 912"
                      value={parentSearchInput}
                      onChange={(e) => setParentSearchInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#143A7B]"
                    />
                    <button
                      type="button"
                      onClick={handleSearchParent}
                      disabled={isSearchingParent || !parentSearchInput.trim()}
                      className="bg-[#143A7B] text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-blue-800 disabled:opacity-50 transition-colors"
                    >
                      {isSearchingParent ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      <span>Pesquisar</span>
                    </button>
                  </div>
                </div>

                {/* Case A: Pai Encontrado */}
                {foundParent ? (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-950">{foundParent.name}</span>
                          <span className="bg-emerald-200/80 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Conta Existente
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 mt-0.5">{foundParent.email} • {foundParent.phone}</p>
                        {foundParent.schoolIds && foundParent.schoolIds.length > 1 && (
                          <p className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>Encarregado com filhos em {foundParent.schoolIds.length} escolas diferentes (Multi-escola suportado).</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFoundParent(null);
                        setParentSearchInput('');
                      }}
                      className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold p-1 hover:bg-emerald-100 rounded-lg"
                      title="Desvincular e escolher outro"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Case B: Não Encontrado -> Criar Novo Pai */
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold">Cadastrar Novo Encarregado de Educação</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      O encarregado não foi encontrado na base de dados. Será criada uma conta no Firebase Auth com as credenciais enviadas por SMS/Email.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nome do Encarregado *</label>
                        <input
                          type="text"
                          required={!foundParent}
                          placeholder="Ex: Fernanda Silva"
                          value={newParentForm.name}
                          onChange={(e) => setNewParentForm({ ...newParentForm, name: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email *</label>
                        <input
                          type="email"
                          required={!foundParent}
                          placeholder="fernanda@email.com"
                          value={newParentForm.email}
                          onChange={(e) => setNewParentForm({ ...newParentForm, email: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Telefone Principal *</label>
                        <input
                          type="tel"
                          required={!foundParent}
                          placeholder="+244 923 884 912"
                          value={newParentForm.phone}
                          onChange={(e) => setNewParentForm({ ...newParentForm, phone: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botões do Formulário */}
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
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-[#143A7B] text-white hover:bg-blue-800 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>A processar matrícula...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Concluir Matrícula (enrollStudent)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
