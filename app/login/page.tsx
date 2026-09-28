'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSystem } from '@/lib/context';
import { loginUser, sendPasswordReset } from '@/services/auth.service';
import { Logo } from '@/components/LogoImg';
import {
  Users,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  ArrowLeft,
  ScanFace,
  AlertCircle,
} from 'lucide-react';

export default function LoginEncarregadoPage() {
  const router = useRouter();
  const { setCurrentUser } = useSystem();

  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
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
    if (!password) {
      setErrorMsg('Por favor, informe a sua palavra-passe.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setResetSuccessMsg('');

    try {
      // Authenticate strictly with role 'pai'
      const { user, mustChangePassword } = await loginUser(identifier.trim(), password, 'pai');

      // Update global session context
      const userAccount = {
        ...user,
        id: user.uid,
        name: user.name || user.nome || '',
        phone: user.phone || user.telefone || '',
        schoolName: 'Colégio Horizonte de Luanda',
      };
      setCurrentUser(userAccount);
      if (typeof window !== 'undefined') {
        localStorage.setItem('alomae_user', JSON.stringify(userAccount));
      }

      // Check mustChangePassword
      if (mustChangePassword) {
        router.push('/pai/alterar-senha');
      } else {
        router.push('/pai/inicio');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao autenticar. Verifique a sua ligação e credenciais.');
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
      setResetSuccessMsg(`Um e-mail oficial com instruções de redefinição de palavra-passe foi enviado para ${resetEmail}.`);
      setShowResetModal(false);
      setResetEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível enviar o e-mail de recuperação. Verifique o endereço introduzido.');
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
      <header className="p-4 sm:p-6 relative z-10 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-blue-200 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition-colors"
            hidden
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Portal</span>
          </Link>
          <Logo variant="light" size="sm" />
        </div>

        <Link
          href="/aluno/terminal"
          className="flex items-center gap-2 bg-blue-950/80 hover:bg-[#143A7B] border border-blue-500/30 text-blue-200 hover:text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm"
          
        >
          <ScanFace className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Modo Dispositivo:</span>
          <span className="font-semibold text-white">Terminal Biométrico</span>
        </Link>
      </header>

      {/* Main Login Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white text-[#121C28] rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* Card Header */}
          <div className="bg-[#143A7B] p-6 sm:p-7 text-white text-center relative">
            <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-3 backdrop-blur-xs border border-white/15">
              <Users className="w-8 h-8 text-blue-200" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-md mb-1 inline-block">
              Portal do Encarregado
            </span>
            <h1 className="font-['Poppins',sans-serif] font-bold text-2xl tracking-tight mb-1">
              Área da Família
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm">
              Identifique-se com o seu e-mail ou número de telefone registado.
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
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email / Telefone */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  E-mail ou Número de Telefone
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
                    placeholder="ex: fernanda.silva@email.com ou +244 923 884 912"
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
                    className="text-[11px] text-[#143A7B] font-medium hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
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
                    <span>Autenticando no Firebase Auth...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Portal da Família</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center" hidden>
              <p className="text-[11px] text-slate-500">
                Não possui conta? As credenciais de encarregado são emitidas exclusivamente pela secretaria da sua instituição escolar.
              </p>
              <div className="mt-3 flex items-center justify-center gap-3 text-xs">
                <Link href="/login-prof" className="text-slate-500 hover:text-[#143A7B]">
                  Sou Professor
                </Link>
                <span className="text-slate-300">•</span>
                <Link href="/login-admin" className="text-slate-500 hover:text-[#143A7B]">
                  Sou Instituição
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-900 border border-slate-100">
            <h3 className="font-['Poppins',sans-serif] font-bold text-lg text-[#0D1B3D] mb-1">
              Recuperar Palavra-passe
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Introduza o seu e-mail registado para receber um link seguro de redefinição de palavra-passe emitido pelo Firebase Authentication.
            </p>

            <form onSubmit={handleSendResetPassword} className="space-y-3.5">
              <div>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#143A7B] text-white text-xs font-semibold hover:bg-[#0D1B3D] disabled:opacity-50 transition-colors cursor-pointer"
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
