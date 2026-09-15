import React from 'react';
import { ValidarGuiaClient } from '@/components/validar/ValidarGuiaClient';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [
    { guideNumber: 'sample' },
    { guideNumber: 'GM-2026-0042' },
    { guideNumber: 'GUIA-MED-202609-00192' },
  ];
}

interface PageProps {
  params: Promise<{ guideNumber: string }>;
}

export default async function ValidarGuiaPage({ params }: PageProps) {
  const resolvedParams = await params;
  const guideNumber = resolvedParams?.guideNumber || 'sample';

  return <ValidarGuiaClient guideNumber={guideNumber} />;
}
