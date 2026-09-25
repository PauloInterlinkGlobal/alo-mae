'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSystem } from '@/lib/context';
import { loginUser, sendPasswordReset } from '@/services/auth.service';
import { Logo } from '@/components/LogoImg';
import {
  Users,
  Building2,
  GraduationCap,
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
  Loader2,
} from 'lucide-react';

export default function LoginEncarregadoPage() {
  const router = useRouter();
  const { setCurrentUser } = useSystem();

  const [portalRole, setPortalRole] = useState<'pai' | 'instituicao' | 'professor'>('pai');
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string>('');
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);

  const fillAdminCredentials = () => {
    setPortalRole('instituicao');
    setIdentifier('paulopintodesenvolvedor@gmail.com');
    setPassword('intituicao123');
  };

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
      const isInputAdmin = identifier.trim().toLowerCase() === 'paulopintodesenvolvedor@gmail.com' ||
        identifier.trim().toLowerCase() === 'direcao@colegiohorizonte.ao';
      const effectiveRole = isInputAdmin ? 'instituicao' : portalRole;

      // Authenticate with effective role
      const { user, mustChangePassword } = await loginUser(identifier.trim(), password, effectiveRole);

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

      // Route based on authenticated user role
      if (user.role === 'instituicao' || user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'professor') {
        router.push('/professor/turma');
      } else {
        if (mustChangePassword) {
          router.push('/pai/alterar-senha');
        } else {
          router.push('/pai/inicio');
        }
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
          {/* Role Tabs */}
          <div className="grid grid-cols-3 bg-slate-100 p-1.5 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setPortalRole('instituicao');
                setErrorMsg('');
              }}
              className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                portalRole === 'instituicao'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Instituição</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPortalRole('pai');
                setErrorMsg('');
              }}
              className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                portalRole === 'pai'
                  ? 'bg-[#143A7B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Encarregado</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPortalRole('professor');
                setErrorMsg('');
              }}
              className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                portalRole === 'professor'
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Professor</span>
            </button>
          </div>

          {/* Card Header */}
          <div
            className={`p-6 sm:p-7 text-white text-center relative transition-colors ${
              portalRole === 'instituicao'
                ? 'bg-slate-900'
                : portalRole === 'professor'
                ? 'bg-indigo-900'
                : 'bg-[#143A7B]'
            }`}
          >
            <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-3 backdrop-blur-xs border border-white/15">
              {portalRole === 'instituicao' ? (
                <Building2 className="w-8 h-8 text-sky-300" />
              ) : portalRole === 'professor' ? (
                <GraduationCap className="w-8 h-8 text-indigo-200" />
              ) : (
                <Users className="w-8 h-8 text-blue-200" />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-md mb-1 inline-block">
              {portalRole === 'instituicao'
                ? 'Administração Geral'
                : portalRole === 'professor'
                ? 'Corpo Docente'
                : 'Portal do Encarregado'}
            </span>
            <h1 className="font-['Poppins',sans-serif] font-bold text-2xl tracking-tight mb-1">
              {portalRole === 'instituicao'
                ? 'Instituição de Ensino'
                : portalRole === 'professor'
                ? 'Área do Docente'
                : 'Área da Família'}
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm">
              {portalRole === 'instituicao'
                ? 'Aceda ao painel institucional para cadastrar e gerir utilizadores.'
                : portalRole === 'professor'
                ? 'Gestão de turmas atribuídas, mini pautas e faltas.'
                : 'Identifique-se com o seu e-mail ou número de telefone registado.'}
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {/* Quick Admin Access pill */}
            <div className="mb-4 p-3 bg-sky-50 border border-sky-200/80 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#0D1B3D] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  Administrador Oficial:
                </span>
                <span className="text-[10px] bg-sky-200/60 text-sky-800 font-semibold px-2 py-0.5 rounded-full">
                  Admin
                </span>
              </div>
              <div className="text-[11px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-mono">
                <span>paulopintodesenvolvedor@gmail.com</span>
                <span className="text-slate-400">• senha: intituicao123</span>
              </div>
              <button
                type="button"
                onClick={fillAdminCredentials}
                className="w-full bg-[#0D1B3D] hover:bg-[#143A7B] text-white py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Usar Credenciais de Administrador</span>
                <ArrowRight className="w-3 h-3 text-cyan-300" />
              </button>
            </div>

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
                  {portalRole === 'instituicao' ? 'E-mail Institucional do Administrador' : 'E-mail ou Número de Telefone'}
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
                    placeholder={
                      portalRole === 'instituicao'
                        ? 'paulopintodesenvolvedor@gmail.com'
                        : 'ex: fernanda.silva@email.com ou +244 923 884 912'
                    }
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
                className={`w-full mt-2 text-white py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-70 ${
                  portalRole === 'instituicao'
                    ? 'bg-slate-900 hover:bg-black shadow-slate-900/20'
                    : portalRole === 'professor'
                    ? 'bg-indigo-900 hover:bg-indigo-950 shadow-indigo-900/20'
                    : 'bg-[#143A7B] hover:bg-[#0D1B3D] shadow-blue-900/20'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {portalRole === 'instituicao'
                        ? 'Entrar no Painel Administrativo'
                        : portalRole === 'professor'
                        ? 'Entrar no Portal do Professor'
                        : 'Entrar no Portal da Família'}
                    </span>
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
