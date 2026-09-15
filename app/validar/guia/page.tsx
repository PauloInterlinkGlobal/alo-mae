'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ValidarGuiaClient } from '@/components/validar/ValidarGuiaClient';

function ValidarGuiaQuery() {
  const searchParams = useSearchParams();
  const guideNumber = searchParams.get('n') || searchParams.get('guia') || searchParams.get('id') || 'sample';

  return <ValidarGuiaClient guideNumber={guideNumber} />;
}

export default function ValidarGuiaQueryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ValidarGuiaQuery />
    </Suspense>
  );
}
