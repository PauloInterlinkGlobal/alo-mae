'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSystem } from '@/lib/context';
import { useToast } from '@/components/Toast';
import {
  loginUser,
  sendPasswordReset,
  loginWithGoogle,
  getRouteForUserRole,
  formatFirebaseAuthError,
} from '@/services/auth.service';
import { Logo } from '@/components/LogoImg';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  ArrowLeft,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import FirebaseDomainAlert from '@/components/FirebaseDomainAlert';

export default function LoginInstituicaoPage() {
  const router = useRouter();
  const { setCurrentUser } = useSystem();
  const toast = useToast();

  const [email, setEmail] = useState<string>('paulopintodesenvolvedor@gmail.com');
  const [password, setPassword] = useState<string>('intituicao123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string>('');
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    setErrorMsg('');
    setResetSuccessMsg('');

    try {
      const { user } = await loginWithGoogle('instituicao');
      const userAccount = {
        ...user,
        id: user.uid,
        name: user.name || user.nome || 'Administrador',
        phone: user.phone || user.telefone || '+244 923 000 001',
        schoolName: user.schoolName || 'Colégio Horizonte de Luanda',
      };
      setCurrentUser(userAccount);
      if (typeof window !== 'undefined') {
        localStorage.setItem('alomae_user', JSON.stringify(userAccount));
      }

      toast.success(`Acesso administrativo autenticado via Google. Bem-vindo(a), ${userAccount.name}.`, 'Painel Institucional');

      // Role-based routing
      const target = getRouteForUserRole(user.role, user.mustChangePassword);
      router.push(target);
    } catch (err: any) {
      const formatted = formatFirebaseAuthError(err);
      setErrorMsg(formatted);
      toast.error(formatted, 'Erro no Login Google');
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const fillAndLogin = async (adminEmail: string, adminPass: string) => {
    setEmail(adminEmail);
    setPassword(adminPass);
    setIsLoading(true);
    setErrorMsg('');
    setResetSuccessMsg('');
    toast.info('Autenticando conta institucional demonstrativa...', 'Acesso Rápido');

    try {
      const { user } = await loginUser(adminEmail.trim(), adminPass, 'instituicao');
      const userAccount = {
        ...user,
        id: user.uid,
        name: user.name || user.nome || 'Paulo Pinto',
        phone: user.phone || user.telefone || '+244 923 000 001',
        schoolName: 'Colégio Horizonte de Luanda',
      };
      setCurrentUser(userAccount);
      if (typeof window !== 'undefined') {
        localStorage.setItem('alomae_user', JSON.stringify(userAccount));
      }
      toast.success('Sessão iniciada como Administrador Principal.', 'Acesso Concedido');
      const target = getRouteForUserRole(user.role, user.mustChangePassword);
      router.push(target);
    } catch (err: any) {
      const formatted = formatFirebaseAuthError(err);
      setErrorMsg(formatted);
      toast.error(formatted, 'Erro de Autenticação');
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      const msg = 'Por favor, informe o e-mail institucional do administrador.';
      setErrorMsg(msg);
      toast.warning(msg, 'Campo Obrigatório');
      return;
    }
    if (!password) {
      const msg = 'Por favor, informe a sua palavra-passe.';
      setErrorMsg(msg);
      toast.warning(msg, 'Campo Obrigatório');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setResetSuccessMsg('');

    try {
      // Authenticate strictly with role 'instituicao'
      const { user, mustChangePassword } = await loginUser(email.trim(), password, 'instituicao');

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

      toast.success('Credenciais validadas com sucesso.', 'Acesso Institucional');
      const target = getRouteForUserRole(user.role, mustChangePassword);
      router.push(target);
    } catch (err: any) {
      const formatted = formatFirebaseAuthError(err);
      setErrorMsg(formatted);
      toast.error(formatted, 'Falha no Acesso');
      setIsLoading(false);
    }
  };

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      const msg = 'Por favor, introduza o e-mail institucional para redefinir a palavra-passe.';
      setErrorMsg(msg);
      toast.warning(msg);
      return;
    }

    setIsSendingReset(true);
    setErrorMsg('');

    try {
      await sendPasswordReset(resetEmail.trim());
      const msg = `Um e-mail de recuperação foi enviado para ${resetEmail}. Verifique o seu Gmail.`;
      setResetSuccessMsg(msg);
      toast.success(msg, 'Recuperação Enviada');
      setShowResetModal(false);
      setResetEmail('');
    } catch (err: any) {
      const formatted = formatFirebaseAuthError(err);
      setErrorMsg(formatted);
      toast.error(formatted, 'Erro na Recuperação');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070F21] text-white flex flex-col justify-between relative overflow-hidden font-['Inter',sans-serif]">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="p-4 sm:p-6 relative z-10 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-sky-200 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Portal</span>
          </Link>
          <Logo variant="light" size="sm" />
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white text-[#121C28] rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* Card Header */}
          <div className="bg-slate-900 p-6 sm:p-7 text-white text-center relative">
            <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-3 backdrop-blur-xs border border-white/15">
              <Building2 className="w-8 h-8 text-sky-300" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 bg-white/10 px-2.5 py-0.5 rounded-md mb-1 inline-block">
              Gestão Escolar
            </span>
            <h1 className="font-['Poppins',sans-serif] font-bold text-2xl tracking-tight mb-1">
              Instituição de Ensino
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm">
              Painel restrito para direção pedagógica e administração escolar.
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {/* Feedback Banners */}
            {resetSuccessMsg && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start justify-between gap-2 shadow-xs animate-fade-in">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{resetSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setResetSuccessMsg('')}
                  className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded cursor-pointer"
                  title="Fechar mensagem"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start justify-between gap-2 shadow-xs animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug font-medium break-words">{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMsg('')}
                  className="text-rose-500 hover:text-rose-800 p-0.5 rounded cursor-pointer"
                  title="Fechar erro"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {errorMsg && <FirebaseDomainAlert errorMsg={errorMsg} />}

            {/* Admin Quick Credentials Card */}
            <div className="mb-5 p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-[#143A7B] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Conta de Administrador Geral
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                  Oficial
                </span>
              </div>
              <div className="text-xs text-slate-700 space-y-1 mb-3 bg-white p-2.5 rounded-xl border border-blue-100 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">E-mail:</span>
                  <span className="font-semibold text-slate-900">paulopintodesenvolvedor@gmail.com</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">Palavra-passe:</span>
                  <span className="font-semibold text-slate-900">intituicao123</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fillAndLogin('paulopintodesenvolvedor@gmail.com', 'intituicao123')}
                disabled={isLoading || isLoadingGoogle}
                className="w-full bg-[#143A7B] hover:bg-[#0D1B3D] text-white py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                <span>Preencher e Entrar como Paulo Pinto (Admin)</span>
              </button>
            </div>

            {/* Google Sign-in Button */}
            <div className="mb-4">
              <GoogleSignInButton
                onClick={handleGoogleLogin}
                isLoading={isLoadingGoogle}
                disabled={isLoading}
                label="Continuar com Google"
                loadingLabel="A autenticar com Google…"
              />

              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  ou entrar com credenciais
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  E-mail Institucional da Administração
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading || isLoadingGoogle}
                    required
                    placeholder="ex: direcao@colegiohorizonte.ao"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Palavra-passe
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setShowResetModal(true);
                    }}
                    className="text-[11px] text-slate-900 font-medium hover:underline cursor-pointer"
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
                    disabled={isLoading || isLoadingGoogle}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

              <button
                type="submit"
                disabled={isLoading || isLoadingGoogle}
                className="w-full mt-2 bg-slate-900 hover:bg-black active:scale-[0.99] text-white py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Autenticando no Firebase Auth...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Painel Institucional</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500">
                🔒 Área de acesso restrito e auditada. Tentativas não autorizadas são bloqueadas e registradas.
              </p>
              <div className="mt-3 flex items-center justify-center gap-3 text-xs">
                <Link href="/login" className="text-slate-500 hover:text-slate-900">
                  Portal do Encarregado
                </Link>
                <span className="text-slate-300">•</span>
                <Link href="/login-prof" className="text-slate-500 hover:text-slate-900">
                  Portal do Professor
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-900 border border-slate-100">
            <h3 className="font-['Poppins',sans-serif] font-bold text-lg text-[#0D1B3D] mb-1">
              Recuperar Palavra-passe
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Introduza o seu e-mail institucional para receber um link de redefinição de palavra-passe.
            </p>

            <form onSubmit={handleSendResetPassword} className="space-y-3.5">
              <div>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="direcao@colegio.ao"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-black disabled:opacity-50 transition-colors cursor-pointer"
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
