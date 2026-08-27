'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaiComprovanteView } from '@/components/pai/PaiComprovanteView';
import { Loader2 } from 'lucide-react';

function ComprovanteContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || 'default';

  return <PaiComprovanteView id={id} />;
}

export default function PaiComprovantePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 text-[#143A7B] animate-spin" />
          <p className="text-xs font-medium">A carregar comprovante oficial...</p>
        </div>
      }
    >
      <ComprovanteContent />
    </Suspense>
  );
}
