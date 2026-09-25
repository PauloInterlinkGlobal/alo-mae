'use client';

import React from 'react';
import { RouteGuard } from '@/components/RouteGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['instituicao', 'admin']}>
      <div className="min-h-screen bg-[#F8F9FF] flex font-['Inter',sans-serif] text-[#121C28]">
        {/* Left Sidebar */}
        <AdminSidebar />

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
