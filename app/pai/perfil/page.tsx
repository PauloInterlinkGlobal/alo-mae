'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/lib/context';
import { updateUserPassword } from '@/services/auth.service';
import { updateUserProfile } from '@/lib/firebase-services';
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Users,
  LogOut,
  CheckCircle2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
} from 'lucide-react';

export default function PaiPerfilPage() {
  const { currentUser, students, logout, setCurrentUser } = useSystem();
  const router = useRouter();

  // Dynamic students linked to this parent
  const parentStudentIds = currentUser?.studentIds || (currentUser?.studentId ? [currentUser.studentId] : []);
  const myStudents = students.filter(
    (s) =>
      parentStudentIds.includes(s.id) ||
      (s.parentUid && s.parentUid === currentUser?.uid) ||
      (s.parentEmail && currentUser?.email && s.parentEmail.toLowerCase() === currentUser.email.toLowerCase())
  );
  const displayStudents = myStudents.length > 0 ? myStudents : students.slice(0, 2);

  // Phone edit state
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneVal, setPhoneVal] = useState(currentUser?.phone || '+244 923 884 912');
  const [phoneSaving, setPhoneSaving] = useState(false);

  // Password change modal/form state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleSavePhone = async () => {
    if (!currentUser?.uid || !phoneVal.trim()) return;
    setPhoneSaving(true);
    try {
      await updateUserProfile(currentUser.uid, { phone: phoneVal.trim() });
      setCurrentUser((prev) => (prev ? { ...prev, phone: phoneVal.trim() } : null));
      setIsEditingPhone(false);
    } catch (e: any) {
      alert('Erro ao atualizar telefone: ' + e.message);
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'A nova palavra-passe deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'As palavras-passe não coincidem.' });
      return;
    }

    setPassLoading(true);
    try {
      await updateUserPassword(newPassword);
      setPassMsg({ type: 'success', text: 'Palavra-passe alterada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPassMsg(null);
      }, 1500);
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message || 'Erro ao alterar palavra-passe.' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div>
        <h1 className="font-['Poppins',sans-serif] font-bold text-xl text-[#0D1B3D]">
          Perfil do Encarregado
        </h1>
        <p className="text-xs text-slate-500">
          Dados cadastrais, educandos vinculados e credenciais de acesso
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#143A7B]/20 shadow-sm shrink-0">
            <img
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300'}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h2 className="font-['Poppins',sans-serif] font-bold text-lg text-[#0D1B3D]">
              {currentUser?.name || 'Encarregado'}
            </h2>
            <p className="text-xs text-[#143A7B] font-semibold">
              Encarregada de Educação Titular
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Conta verificada • Colégio Horizonte de Luanda
            </p>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-3 text-xs text-slate-700">
          {/* Phone (editable) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3 flex-1 mr-2">
              <Phone className="w-4 h-4 text-[#143A7B] shrink-0" />
              <div className="flex-1">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  Telefone de Contacto (SMS / Notificações)
                </span>
                {isEditingPhone ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={phoneVal}
                      onChange={(e) => setPhoneVal(e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs w-full max-w-[200px]"
                    />
                    <button
                      onClick={handleSavePhone}
                      disabled={phoneSaving}
                      className="px-2.5 py-1 bg-[#143A7B] text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                    >
                      {phoneSaving ? '...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => setIsEditingPhone(false)}
                      className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <span className="font-medium text-slate-900">{currentUser?.phone || phoneVal}</span>
                )}
              </div>
            </div>
            {!isEditingPhone && (
              <button
                onClick={() => setIsEditingPhone(true)}
                className="text-[11px] text-[#143A7B] hover:underline font-semibold cursor-pointer"
              >
                Editar
              </button>
            )}
          </div>

          {/* Email (read-only for security) */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Mail className="w-4 h-4 text-[#143A7B] shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                  E-mail Oficial Registado
                </span>
                <span title="Protegido por RBAC">
                  <Lock className="w-3 h-3 text-slate-400" />
                </span>
              </div>
              <span className="font-medium text-slate-900">{currentUser?.email}</span>
            </div>
          </div>

          {/* Institutional School Binding (read-only) */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Building2 className="w-4 h-4 text-[#143A7B] shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                Instituição Vinculada
              </span>
              <span className="font-medium text-slate-900">Colégio Horizonte de Luanda</span>
            </div>
          </div>
        </div>
      </div>

      {/* Children linked (Multiple Students Support) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
        <h3 className="font-['Poppins',sans-serif] font-bold text-sm text-[#0D1B3D] mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#143A7B]" />
            <span>Educandos Vinculados ({displayStudents.length})</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">
            Gerido pela Secretaria
          </span>
        </h3>

        <div className="space-y-3">
          {displayStudents.map((std) => (
            <div
              key={std.id}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                  <img src={std.photoUrl} alt={std.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-900">{std.name}</h4>
                  <p className="text-[11px] text-slate-500">{std.className} • Matrícula {std.matricula}</p>
                </div>
              </div>

              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Biometria Ativa</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Security and Password Action Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#143A7B] flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900">Segurança da Conta</h4>
            <p className="text-[11px] text-slate-500">Altere a sua palavra-passe de acesso a qualquer momento</p>
          </div>
        </div>

        <button
          onClick={() => setShowPasswordModal(true)}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#143A7B] text-slate-700 hover:text-white text-xs font-semibold transition-all cursor-pointer"
        >
          Alterar Senha
        </button>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-900 border border-slate-100">
            <h3 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D] mb-1">
              Alterar Palavra-passe
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Introduza uma nova senha segura para a sua conta no portal da família.
            </p>

            {passMsg && (
              <div
                className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  passMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {passMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{passMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Nova Palavra-passe
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Confirmar Palavra-passe
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repita a palavra-passe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#143A7B] text-white text-xs font-semibold hover:bg-[#0D1B3D] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {passLoading ? 'A guardar...' : 'Guardar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Terminar Sessão</span>
      </button>
    </div>
  );
}
