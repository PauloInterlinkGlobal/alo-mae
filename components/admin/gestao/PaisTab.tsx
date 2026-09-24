'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, Student, SchoolClass } from '@/lib/types';
import { getParents, updateParentContact } from '@/services/users.service';
import { getStudents } from '@/services/students.service';
import { getClasses } from '@/services/classes.service';
import {
  createManagedUser,
  toggleUserActiveStatus,
  reissueCredentials,
  associateStudentToParent,
  dissociateStudentFromParent,
} from '@/services/auth.service';
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
  Plus,
  KeyRound,
  Copy,
  AlertCircle,
  UserCheck,
  UserX,
  GraduationCap,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const PaisTab: React.FC = () => {
  const [parents, setParents] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinkStudentModalOpen, setIsLinkStudentModalOpen] = useState(false);
  const [selectedParentForAction, setSelectedParentForAction] = useState<UserProfile | null>(null);

  // Temporary Credentials Display Modal
  const [credentialsModal, setCredentialsModal] = useState<{
    isOpen: boolean;
    name: string;
    email: string;
    phone: string;
    temporaryPassword: string;
  } | null>(null);

  // Create Form State
  const [createData, setCreateData] = useState({
    name: '',
    phone: '',
    email: '',
    selectedStudentIds: [] as string[],
  });

  // Edit Form State
  const [editData, setEditData] = useState({
    name: '',
    phone: '',
    avatarUrl: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    setTimeout(() => setToastMsg(null), 4000);
  }

  // 1. Create Guardian
  async function handleCreateGuardian(e: React.FormEvent) {
    e.preventDefault();
    if (!createData.name.trim() || !createData.phone.trim()) {
      alert('Por favor preencha o nome e telefone do encarregado.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await createManagedUser({
        name: createData.name.trim(),
        phone: createData.phone.trim(),
        email: createData.email.trim() || undefined,
        role: 'pai',
        schoolId: currentSchoolId,
        studentIds: createData.selectedStudentIds,
      });

      setIsCreateModalOpen(false);
      setCreateData({ name: '', phone: '', email: '', selectedStudentIds: [] });
      await loadData();

      // Show temporary password modal
      setCredentialsModal({
        isOpen: true,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone || '',
        temporaryPassword: result.temporaryPassword,
      });
      showToast('Encarregado cadastrado com sucesso no Firebase!');
    } catch (err: any) {
      alert('Erro ao criar encarregado: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // 2. Edit Contact
  function openEditModal(p: UserProfile) {
    setSelectedParentForAction(p);
    setEditData({
      name: p.name,
      phone: p.phone || '',
      avatarUrl: p.avatarUrl || '',
    });
    setIsEditModalOpen(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedParentForAction || !editData.name.trim()) return;

    setIsSaving(true);
    try {
      await updateParentContact(selectedParentForAction.uid, {
        name: editData.name,
        phone: editData.phone,
        avatarUrl: editData.avatarUrl,
      });

      showToast('Dados de contacto atualizados!');
      setIsEditModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // 3. Toggle Active/Deactivated
  async function handleToggleStatus(p: UserProfile) {
    const newStatus = p.active === false ? true : false;
    const confirmMsg = newStatus
      ? `Reativar o acesso de ${p.name}?`
      : `Bloquear e desativar o acesso de ${p.name}?`;

    if (!confirm(confirmMsg)) return;

    try {
      await toggleUserActiveStatus(p.uid, newStatus);
      showToast(`Utilizador ${newStatus ? 'reativado' : 'desativado'} com sucesso.`);
      await loadData();
    } catch (err: any) {
      alert('Erro ao alterar estado da conta: ' + err.message);
    }
  }

  // 4. Reissue Credentials
  async function handleReissueCredentials(p: UserProfile) {
    if (!confirm(`Reemitir senha temporária para ${p.name}? O encarregado terá de alterá-la no próximo login.`)) return;

    try {
      const newPass = await reissueCredentials(p.uid);
      setCredentialsModal({
        isOpen: true,
        name: p.name,
        email: p.email,
        phone: p.phone || '',
        temporaryPassword: newPass,
      });
      await loadData();
      showToast('Nova senha temporária gerada com sucesso.');
    } catch (err: any) {
      alert('Erro ao reemitir credenciais: ' + err.message);
    }
  }

  // 5. Link / Unlink Student
  function openLinkStudentModal(p: UserProfile) {
    setSelectedParentForAction(p);
    setIsLinkStudentModalOpen(true);
  }

  async function handleLinkStudent(studentId: string) {
    if (!selectedParentForAction) return;
    try {
      await associateStudentToParent(selectedParentForAction.uid, studentId, currentSchoolId);
      showToast('Aluno vinculado ao encarregado!');
      await loadData();
      // update selected parent in state
      setSelectedParentForAction(prev => prev ? {
        ...prev,
        studentIds: Array.from(new Set([...(prev.studentIds || []), studentId])),
      } : null);
    } catch (err: any) {
      alert('Erro ao vincular aluno: ' + err.message);
    }
  }

  async function handleUnlinkStudent(parentUid: string, studentId: string) {
    if (!confirm('Desvincular este educando do encarregado?')) return;
    try {
      await dissociateStudentFromParent(parentUid, studentId);
      showToast('Vínculo com aluno removido.');
      await loadData();
    } catch (err: any) {
      alert('Erro ao desvincular aluno: ' + err.message);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = parents.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#0D1B3D] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-blue-400/30 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-[#143A7B] text-white shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-[#0D1B3D]">
              Gestão Centralizada de Encarregados (RBAC)
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              O encarregado não possui cadastro público. O provisionamento de contas, emissão de senhas temporárias e associação de educandos é gerido exclusivamente pela administração escolar.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Encarregado</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por nome, telefone ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total de Encarregados: <strong className="text-slate-800">{filtered.length}</strong>
        </div>
      </div>

      {/* Parents Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <div className="w-7 h-7 border-2 border-[#143A7B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          A carregar registos de encarregados...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
          Nenhum encarregado encontrado com os termos pesquisados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const linkedStudentIds = p.studentIds || (p.studentId ? [p.studentId] : []);
            const linkedStudents = students.filter(s => linkedStudentIds.includes(s.id));
            const isActive = p.active !== false;

            return (
              <div
                key={p.uid}
                className={`bg-white rounded-2xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                  isActive ? 'border-slate-200 hover:border-blue-300' : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                <div>
                  {/* Top Row: Avatar, Name, Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#143A7B] font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden border border-blue-200">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          p.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {!isActive && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">
                              Bloqueado
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-500">Encarregado(a) de Educação</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {p.mustChangePassword && (
                        <span
                          title="O encarregado ainda não alterou a senha inicial fornecida"
                          className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3 text-amber-600" />
                          <span>Senha Temp.</span>
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{p.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{p.phone || 'Sem telefone registado'}</span>
                    </div>
                  </div>

                  {/* Associated Students */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-[#143A7B]" />
                        <span>Educandos Associados ({linkedStudents.length}):</span>
                      </span>
                      <button
                        onClick={() => openLinkStudentModal(p)}
                        className="text-[10px] text-[#143A7B] hover:underline font-bold cursor-pointer"
                      >
                        + Vincular Aluno
                      </button>
                    </div>

                    {linkedStudents.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Nenhum educando vinculado a esta conta.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {linkedStudents.map((std) => (
                          <span
                            key={std.id}
                            className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200/80 px-2 py-1 rounded-lg text-[11px] font-medium"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{std.name}</span>
                            <button
                              type="button"
                              onClick={() => handleUnlinkStudent(p.uid, std.id)}
                              title="Desvincular educando"
                              className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleReissueCredentials(p)}
                    title="Gerar nova senha temporária para o encarregado"
                    className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reemitir Senha</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(p)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {isActive ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                    <span>{isActive ? 'Desativar' : 'Reativar'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Cadastrar Novo Encarregado */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-slate-900 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D]">
                  Cadastrar Novo Encarregado
                </h3>
                <p className="text-xs text-slate-500">
                  Crie a conta no Firebase Auth e associe os educandos.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGuardian} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  placeholder="ex: Carlos Manuel da Silva"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Número de Telefone Principal *
                </label>
                <input
                  type="text"
                  required
                  value={createData.phone}
                  onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                  placeholder="+244 923 000 000"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  E-mail do Encarregado (Opcional)
                </label>
                <input
                  type="email"
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  placeholder="ex: encarregado@email.com (ou automático)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Se deixado em branco, um e-mail no domínio institucional será gerado para autenticação.
                </span>
              </div>

              {/* Associate Students multiselect */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Associar Educando(s)
                </label>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                  {students.length === 0 ? (
                    <p className="text-[11px] text-slate-400">Nenhum aluno registado.</p>
                  ) : (
                    students.map((std) => {
                      const isSelected = createData.selectedStudentIds.includes(std.id);
                      return (
                        <label
                          key={std.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer ${
                            isSelected ? 'bg-blue-100/70 text-blue-900 font-semibold' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCreateData({
                                  ...createData,
                                  selectedStudentIds: [...createData.selectedStudentIds, std.id],
                                });
                              } else {
                                setCreateData({
                                  ...createData,
                                  selectedStudentIds: createData.selectedStudentIds.filter(id => id !== std.id),
                                });
                              }
                            }}
                            className="rounded text-[#143A7B] focus:ring-0"
                          />
                          <span>{std.name} ({std.className})</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#143A7B] text-white text-xs font-semibold hover:bg-[#0D1B3D] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSaving ? 'A registar...' : 'Criar Encarregado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Editar Contacto */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 border border-slate-100">
            <h3 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D] mb-1">
              Editar Dados de Contacto
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Atualize o nome e telefone de contacto do encarregado.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Telefone</label>
                <input
                  type="text"
                  required
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#143A7B] text-white text-xs font-semibold hover:bg-[#0D1B3D] disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'A guardar...' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Vincular Aluno */}
      {isLinkStudentModalOpen && selectedParentForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D]">
                  Vincular Aluno a {selectedParentForAction.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Clique para adicionar ou vincular educandos da instituição.
                </p>
              </div>
              <button
                onClick={() => setIsLinkStudentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 p-1 border border-slate-200 rounded-xl bg-slate-50 mb-4">
              {students.map((std) => {
                const isAlreadyLinked = (selectedParentForAction.studentIds || []).includes(std.id);
                return (
                  <div
                    key={std.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{std.name}</span>
                      <span className="text-[10px] text-slate-500">{std.className} • Matrícula {std.matricula}</span>
                    </div>

                    {isAlreadyLinked ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                        Vinculado
                      </span>
                    ) : (
                      <button
                        onClick={() => handleLinkStudent(std.id)}
                        className="text-[11px] bg-[#143A7B] text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-[#0D1B3D] cursor-pointer"
                      >
                        + Vincular
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setIsLinkStudentModalOpen(false)}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal 4: Credenciais Temporárias Emitidas (Apenas exibidas à instituição) */}
      {credentialsModal && credentialsModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-slate-900 border border-slate-100 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="font-['Poppins',sans-serif] font-bold text-lg text-[#0D1B3D] mb-1">
              Credenciais de Acesso Geradas
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Forneça as credenciais abaixo ao encarregado. Por motivos de segurança, a senha temporária não será armazenada no sistema e deverá ser alterada no primeiro acesso.
            </p>

            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-800 mb-4 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Encarregado</span>
                <span className="font-semibold text-slate-900 font-sans">{credentialsModal.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">E-mail de Acesso</span>
                <span className="text-[#143A7B] font-bold">{credentialsModal.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">Telefone</span>
                <span>{credentialsModal.phone}</span>
              </div>
              <div className="pt-1 border-t border-slate-200">
                <span className="text-[10px] text-amber-700 font-sans block uppercase font-bold">Palavra-passe Temporária</span>
                <span className="text-emerald-700 font-extrabold text-sm tracking-wider">{credentialsModal.temporaryPassword}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const info = `Acesso Alô mãe — Encarregado(a): ${credentialsModal.name}\nE-mail: ${credentialsModal.email}\nTelefone: ${credentialsModal.phone}\nPalavra-passe Temporária: ${credentialsModal.temporaryPassword}\nAceda em: /login`;
                  copyToClipboard(info);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copiado!' : 'Copiar Credenciais'}</span>
              </button>

              <button
                onClick={() => setCredentialsModal(null)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#143A7B] text-white text-xs font-bold hover:bg-[#0D1B3D] transition-colors cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
