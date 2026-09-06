'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/lib/context';
import { sendPasswordReset } from '@/services/auth.service';
import { Logo } from '@/components/LogoImg';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  ScanFace,
  Phone,
  Eye,
  EyeOff,
  User,
  GraduationCap,
  Building2,
  CheckCircle,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser } = useSystem();

  const [identifier, setIdentifier] = useState<string>('fernanda.silva@email.com');
  const [password, setPassword] = useState<string>('••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string>('');
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Por favor, informe o seu e-mail ou telefone.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setResetSuccessMsg('');

    try {
      const trimmedInput = identifier.trim();
      const success = await login(trimmedInput, password);

      if (success) {
        const normalized = trimmedInput.toLowerCase();
        if (normalized.includes('prof') || normalized.includes('docente') || normalized.includes('maria')) {
          router.push('/professor/turma');
        } else if (normalized.includes('admin') || normalized.includes('direcao') || normalized.includes('colegio') || normalized.includes('instituicao')) {
          router.push('/admin/dashboard');
        } else {
          router.push('/pai/inicio');
        }
      } else {
        setErrorMsg('Utilizador não encontrado ou palavra-passe incorreta. Verifique os dados de acesso.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao autenticar. Verifique a sua ligação à internet.');
      setIsLoading(false);
    }
  };

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setIsSendingReset(true);
    setErrorMsg('');

    try {
      await sendPasswordReset(resetEmail.trim());
      setResetSuccessMsg(`Um e-mail com as instruções de recuperação foi enviado para ${resetEmail}.`);
      setShowResetModal(false);
      setResetEmail('');
    } catch {
      setErrorMsg('Não foi possível enviar o e-mail de recuperação. Verifique o endereço introduzido.');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1B3D] text-white flex flex-col justify-between relative overflow-hidden font-['Inter',sans-serif]">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#143A7B]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="p-6 relative z-10 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Logo variant="light" size="md" />

        {/* Direct Hardware Terminal Link */}
        <button
          onClick={() => router.push('/aluno/terminal')}
          className="flex items-center gap-2 bg-blue-950/80 hover:bg-[#143A7B] border border-blue-500/30 text-blue-200 hover:text-white px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm cursor-pointer"
        >
          <ScanFace className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Modo Dispositivo:</span>
          <span className="font-semibold text-white">Terminal Biométrico</span>
        </button>
      </header>

      {/* Main Login Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white text-[#121C28] rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* Card Header */}
          <div className="bg-[#143A7B] p-6 sm:p-7 text-white text-center relative">
            <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-3 backdrop-blur-xs border border-white/15">
              <ShieldCheck className="w-8 h-8 text-blue-200" />
            </div>
            <h1 className="font-['Poppins',sans-serif] font-bold text-2xl tracking-tight mb-1">
              Portal Unificado Alô mãe
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm">
              Tecnologia que aproxima. Segurança que tranquiliza.
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {/* Messages */}
            {resetSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email / Telefone */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  E-mail institucional ou Telefone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    {identifier.includes('@') ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="seu.email@escola.ao ou +244..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Palavra-passe */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Palavra-passe
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(identifier.includes('@') ? identifier : '');
                      setShowResetModal(true);
                    }}
                    className="text-[11px] text-[#143A7B] hover:underline cursor-pointer"
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
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

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-[#143A7B] hover:bg-[#0D1B3D] active:scale-[0.99] text-white py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all cursor-pointer disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Autenticando no Firebase...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Pre-fills for Testing convenience */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Atalhos de Demonstração (Clique para preencher)
              </label>
              <div className="grid grid-cols-3 gap-1.5" hidden>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('fernanda.silva@email.com');
                    setPassword('••••••••');
                    setErrorMsg('');
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] border transition-all cursor-pointer ${
                    identifier === 'fernanda.silva@email.com'
                      ? 'bg-blue-50 border-blue-200 text-[#143A7B] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-3.5 h-3.5 mb-1 text-blue-600" />
                  <span>Encarregado</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('maria.fernandes@colegiohorizonte.ao');
                    setPassword('••••••••');
                    setErrorMsg('');
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] border transition-all cursor-pointer ${
                    identifier === 'maria.fernandes@colegiohorizonte.ao'
                      ? 'bg-blue-50 border-blue-200 text-[#143A7B] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 mb-1 text-indigo-600" />
                  <span>Professor</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('direcao@colegiohorizonte.ao');
                    setPassword('••••••••');
                    setErrorMsg('');
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] border transition-all cursor-pointer ${
                    identifier === 'direcao@colegiohorizonte.ao'
                      ? 'bg-blue-50 border-blue-200 text-[#143A7B] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 mb-1 text-sky-600" />
                  <span>Instituição</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center mt-3">
                🔒 Sistema protegido com autenticação Firebase e controle de acesso baseado em funções (RBAC).
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-900 animate-in fade-in zoom-in-95">
            <h3 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D] mb-1">
              Recuperar Palavra-passe
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Introduza o seu e-mail registado para receber um link de redefinição de palavra-passe.
            </p>

            <form onSubmit={handleSendResetPassword} className="space-y-3">
              <div>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="seu.email@escola.ao"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#143A7B] text-white text-xs font-semibold hover:bg-[#0D1B3D] disabled:opacity-50 cursor-pointer"
                >
                  {isSendingReset ? 'A enviar...' : 'Enviar Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="p-4 relative z-10 text-center text-slate-400 text-xs">
        <p>© 2026 Alô mãe — Conexão que cuida. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
