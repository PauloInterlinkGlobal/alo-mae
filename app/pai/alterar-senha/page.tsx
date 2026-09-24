'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/lib/context';
import { updateUserPassword } from '@/services/auth.service';
import { Logo } from '@/components/LogoImg';
import {
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  KeyRound,
} from 'lucide-react';

export default function AlterarSenhaObrigatoriaPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useSystem();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('A nova palavra-passe deve conter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('As palavras-passe introduzidas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      await updateUserPassword(newPassword);

      // Update local current user state
      if (currentUser) {
        const updated = {
          ...currentUser,
          mustChangePassword: false,
        };
        setCurrentUser(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('alomae_user', JSON.stringify(updated));
        }
      }

      setSuccessMsg('Palavra-passe alterada com sucesso! A redirecionar para o portal...');

      setTimeout(() => {
        if (currentUser?.role === 'professor') {
          router.push('/professor/turma');
        } else if (currentUser?.role === 'instituicao' || currentUser?.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/pai/inicio');
        }
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao atualizar palavra-passe. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1B3D] text-white flex flex-col justify-between p-4 sm:p-6 font-['Inter',sans-serif]">
      {/* Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-center py-4">
        <Logo variant="light" size="sm" />
      </header>

      {/* Center Card */}
      <main className="max-w-md w-full mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 text-[#121C28] shadow-2xl border border-white/20">
          {/* Badge & Icon */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <KeyRound className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-md mb-2 inline-block">
              Primeiro Acesso / Segurança
            </span>
            <h1 className="font-['Poppins',sans-serif] font-bold text-xl sm:text-2xl text-[#0D1B3D]">
              Alterar Palavra-passe
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
              Por segurança, altere a senha temporária fornecida pela instituição antes de aceder ao portal.
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nova Palavra-passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Confirmar Nova Palavra-passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repita a nova palavra-passe"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">Dica de segurança:</p>
              <p>• Escolha uma palavra-passe pessoal e intransmissível com letras e números.</p>
              <p>• Não utilize senhas repetidas de outros serviços.</p>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isLoading || !!successMsg}
              className="w-full mt-2 bg-[#143A7B] hover:bg-[#0D1B3D] text-white py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>A guardar nova palavra-passe...</span>
                </>
              ) : (
                <>
                  <span>Guardar e Aceder ao Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center text-slate-400 text-xs py-4">
        <p>© 2026 Alô mãe — Conexão que cuida.</p>
      </footer>
    </div>
  );
}
