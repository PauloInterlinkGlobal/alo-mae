import React from 'react';
import { PaiComprovanteView } from '@/components/pai/PaiComprovanteView';

export function generateStaticParams() {
  return [
    { id: 'log-1' },
    { id: 'log-2' },
    { id: 'log-3' },
    { id: 'log-4' },
    { id: 'REC-2025-0592' },
    { id: 'default' },
  ];
}

export default async function PaiComprovantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <PaiComprovanteView id={resolvedParams.id} />;
}
