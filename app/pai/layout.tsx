'use client';

import React from 'react';
import { RouteGuard } from '@/components/RouteGuard';
import { PaiHeader } from '@/components/pai/PaiHeader';
import { PaiBottomNav } from '@/components/pai/PaiBottomNav';
import { FloatingChatWidget } from '@/components/chat/FloatingChatWidget';

export default function PaiLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['pai']}>
      <div className="min-h-screen bg-[#F8F9FF] flex flex-col font-['Inter',sans-serif] text-[#121C28] pb-24">
        {/* Top Header */}
        <PaiHeader />

        {/* Content Viewport */}
        <main className="flex-1 max-w-xl mx-auto w-full px-4 pt-4 sm:pt-6">
          {children}
        </main>

        {/* Floating Chat Widget (Float Bottom: Encarregado ↔ Professor) */}
        <FloatingChatWidget defaultRole="pai" positionClass="bottom-22 right-4 sm:right-6" />

        {/* Mobile App Bottom Navigation */}
        <PaiBottomNav />
      </div>
    </RouteGuard>
  );
}
