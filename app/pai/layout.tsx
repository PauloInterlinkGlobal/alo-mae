'use client';

import React from 'react';
import { RouteGuard } from '@/components/RouteGuard';
import { PaiHeader } from '@/components/pai/PaiHeader';
import { PaiBottomNav } from '@/components/pai/PaiBottomNav';

export default function PaiLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['pai']}>
      <div className="min-h-screen bg-[#F8F9FF] flex flex-col font-['Inter',sans-serif] text-[#121C28] pb-[calc(4.25rem+env(safe-area-inset-bottom))] sm:pb-24">
        {/* Top Header */}
        <PaiHeader />

        {/* Content Viewport */}
        <main className="flex-1 max-w-xl mx-auto w-full px-3 sm:px-4 pt-3 sm:pt-6">
          {children}
        </main>

        {/* Mobile App Bottom Navigation */}
        <PaiBottomNav />
      </div>
    </RouteGuard>
  );
}
