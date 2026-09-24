'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

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
