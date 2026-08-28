import React from 'react';
import { PaiComprovanteView } from '@/components/pai/PaiComprovanteView';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ id: 'sample' }];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ComprovanteIdPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || 'sample';

  return <PaiComprovanteView id={id} />;
}
