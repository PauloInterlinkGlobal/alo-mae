'use client';

import React from 'react';
import { SystemProvider, useSystem } from '@/lib/context';
import { ComprovanteModal } from '@/components/ComprovanteModal';
import { GuiaAtendimentoModal } from '@/components/GuiaAtendimentoModal';
import { GlobalToast } from '@/components/GlobalToast';
import { MobileAppBridge } from '@/components/MobileAppBridge';
import { ToastProvider } from '@/components/Toast';

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
        autoPrint={activeMedicalGuide?.autoPrint}
        onClose={() => setActiveMedicalGuide(null)}
      />

      <GlobalToast />
    </>
  );
}


export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SystemProvider>
        {children}
        <GlobalModals />
      </SystemProvider>
    </ToastProvider>
  );
}
