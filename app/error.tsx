'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-md w-full shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Ocorreu um erro</h2>
        <p className="text-sm text-slate-500 mb-6">
          Algo não correu como esperado. Por favor tente novamente.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#143A7B] text-white font-bold text-sm hover:bg-[#0D1B3D] transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
