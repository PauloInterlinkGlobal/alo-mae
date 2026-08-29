'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/lib/context';
import { UserRole } from '@/lib/types';
import { Logo } from '@/components/LogoImg';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  User,
  GraduationCap,
  Building2,
  ScanFace,
  CheckCircle2,
  Phone,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPageAdmin() {
  const router = useRouter();
  const { login } = useSystem();

  const [selectedRole, setSelectedRole] = useState<UserRole>('pai');
  const [identifier, setIdentifier] = useState<string>('fernanda.silva@email.com');
  const [password, setPassword] = useState<string>('••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'pai') {
      setIdentifier('fernanda.silva@email.com');
    } else if (role === 'professor') {
      setIdentifier('maria.fernandes@colegiohorizonte.ao');
    } else if (role === 'instituicao') {
      setIdentifier('direcao@colegiohorizonte.ao');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Por favor, informe o seu e-mail ou telefone.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      await login(selectedRole, identifier);
      if (selectedRole === 'pai') {
        router.push('/pai/inicio');
      } else if (selectedRole === 'professor') {
        router.push('/professor/turma');
      } else if (selectedRole === 'instituicao') {
        router.push('/admin/dashboard');
      }
    } catch {
      setErrorMsg('Ocorreu um erro ao autenticar. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1B3D] text-white flex flex-col justify-between relative overflow-hidden font-['Inter',sans-serif]">
      {/* Background ambient lighting  */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#143A7B]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="p-6 relative z-10 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Logo variant="light" size="md" />

        {/* Direct Hardware Terminal Link */}
        <button
          onClick={() => router.push('/aluno/terminal')}
          className="flex items-center gap-2 bg-blue-950/80 hover:bg-[#143A7B] border border-blue-500/30 text-blue-200 hover:text-white px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm"
          
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
            {/* Profile / Role Selector */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Selecione o seu perfil de acesso:
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('pai')}
                  className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-semibold transition-all ${
                    selectedRole === 'pai'
                      ? 'bg-white text-[#143A7B] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <User className="w-4 h-4 mb-1" />
                  <span>Pai / Mãe</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('professor')}
                  className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-semibold transition-all ${
                    selectedRole === 'professor'
                      ? 'bg-white text-[#143A7B] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                
                >
                  <GraduationCap className="w-4 h-4 mb-1" />
                  <span>Professor</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('instituicao')}
                  className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-semibold transition-all ${
                    selectedRole === 'instituicao'
                      ? 'bg-white text-[#143A7B] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  
                >
                  <Building2 className="w-4 h-4 mb-1" />
                  <span>Instituição</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

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
                  <span className="text-[11px] text-[#143A7B] hover:underline cursor-pointer">
                    Esqueceu?
                  </span>
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
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
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
                    <span>Acedendo ao portal...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar como {selectedRole === 'pai' ? 'Encarregado' : selectedRole === 'professor' ? 'Professor' : 'Instituição'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Info Helper */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 text-center">
                🔒 Sistema protegido com criptografia de ponta a ponta e validade legal de registos.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 relative z-10 text-center text-slate-400 text-xs">
        <p>© 2026 Alô mãe — Conexão que cuida. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
