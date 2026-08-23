'use client';

import React from 'react';
import { RouteGuard } from '@/components/RouteGuard';
import { ProfessorNav } from '@/components/professor/ProfessorNav';

export default function ProfessorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['professor']}>
      <div className="min-h-screen bg-[#F8F9FF] flex flex-col font-['Inter',sans-serif] text-[#121C28]">
        {/* Professor Navigation Header */}
        <ProfessorNav />

        {/* Content Container */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}
