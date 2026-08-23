'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/lib/context';
import { UserRole } from '@/lib/types';
import { ShieldAlert, LogIn, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/LogoImg';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, allowedRoles }) => {
  const { currentUser, isAuthenticated, login } = useSystem();
  const router = useRouter();

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0D1B3D] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#143A7B]">
            <LogIn className="w-8 h-8" />
          </div>
          <h2 className="font-['Poppins',sans-serif] font-bold text-xl text-[#0D1B3D] mb-2">
            Autenticação Necessária
          </h2>
          <p className="text-[#687280] text-sm mb-6">
            Por favor, inicie sessão com as suas credenciais para aceder a esta área da plataforma.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-[#143A7B] hover:bg-[#0D1B3D] text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
          >
            <span>Ir para o Ecrã de Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(currentUser.role)) {
    const roleLabels: Record<UserRole, string> = {
      pai: 'Encarregado de Educação (Pai/Mãe)',
      professor: 'Professor(a) / Docente',
      instituicao: 'Administração / Instituição',
    };

    const targetRoute =
      currentUser.role === 'pai'
        ? '/pai/inicio'
        : currentUser.role === 'professor'
        ? '/professor/turma'
        : '/admin/dashboard';

    return (
      <div className="min-h-screen bg-[#0D1B3D] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="mb-2">
            <Logo size="sm" className="justify-center mb-3" />
          </div>
          <h2 className="font-['Poppins',sans-serif] font-bold text-xl text-[#0D1B3D] mb-2">
            Acesso Não Autorizado
          </h2>
          <p className="text-[#687280] text-sm mb-4">
            A sua conta atual está autenticada como <strong>{roleLabels[currentUser.role]}</strong> e não possui permissões para visualizar este módulo restrito.
          </p>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-6 text-xs text-left text-slate-600">
            <p className="font-semibold text-slate-800 mb-1">Módulos permitidos para si:</p>
            <p className="text-[#143A7B] font-medium">• {targetRoute}</p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => router.push(targetRoute)}
              className="w-full bg-[#143A7B] hover:bg-[#0D1B3D] text-white py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
            >
              <span>Ir para o meu Portal ({roleLabels[currentUser.role].split(' ')[0]})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const targetRole = allowedRoles[0];
                login(targetRole);
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-medium transition-all"
            >
              Alternar para conta {allowedRoles[0].toUpperCase()}
            </button>

            <button
              onClick={() => router.push('/login')}
              className="w-full text-slate-500 hover:text-slate-800 text-xs py-2 transition-colors"
            >
              Sair e trocar de conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
