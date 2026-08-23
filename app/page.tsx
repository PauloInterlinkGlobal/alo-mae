'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/lib/context';

export default function RootIndexPage() {
  const router = useRouter();
  const { currentUser, isAuthenticated } = useSystem();

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      router.replace('/login');
    } else {
      if (currentUser.role === 'pai') {
        router.replace('/pai/inicio');
      } else if (currentUser.role === 'professor') {
        router.replace('/professor/turma');
      } else if (currentUser.role === 'instituicao') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-[#0D1B3D] flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-10 h-10 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-['Poppins',sans-serif] text-sm text-blue-200">
          Carregando portal Alô mãe...
        </p>
      </div>
    </div>
  );
}
