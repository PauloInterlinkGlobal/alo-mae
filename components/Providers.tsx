'use client';

import React from 'react';
import { SystemProvider, useSystem } from '@/lib/context';
import { ComprovanteModal } from '@/components/ComprovanteModal';
import { GuiaAtendimentoModal } from '@/components/GuiaAtendimentoModal';
import { GlobalToast } from '@/components/GlobalToast';
import { MobileAppBridge } from '@/components/MobileAppBridge';

function GlobalModals() {
  const {
    selectedReceiptLog,
    setSelectedReceiptLog,
    activeMedicalGuide,
    setActiveMedicalGuide,
  } = useSystem();

  return (
    <>
      <MobileAppBridge />
      <ComprovanteModal
        log={selectedReceiptLog}
        onClose={() => setSelectedReceiptLog(null)}
      />

      <GuiaAtendimentoModal
        guideData={activeMedicalGuide}
        onClose={() => setActiveMedicalGuide(null)}
      />

      <GlobalToast />
    </>
  );
}


export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SystemProvider>
      {children}
      <GlobalModals />
    </SystemProvider>
  );
}
