'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/lib/context';
import { Bell, CheckCircle, AlertTriangle, X } from 'lucide-react';

export const GlobalToast: React.FC = () => {
  const { toastMessage, dismissToast, login } = useSystem();
  const router = useRouter();

  if (!toastMessage) return null;

  const isSuccess = toastMessage.type === 'success';
  const isAlert = toastMessage.type === 'alert';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-[#0D1B3D] text-white p-4 rounded-2xl shadow-2xl border border-[#96B5FE]/30 flex items-start gap-3.5 backdrop-blur-md">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isSuccess
              ? 'bg-emerald-500 text-white'
              : isAlert
              ? 'bg-red-500 text-white'
              : 'bg-[#143A7B] text-[#96B5FE]'
          }`}
        >
          {isSuccess ? (
            <CheckCircle className="w-5 h-5" />
          ) : isAlert ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-sm text-white truncate">{toastMessage.title}</h4>
            <button
              onClick={dismissToast}
              className="text-gray-400 hover:text-white transition-colors p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">{toastMessage.desc}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={() => {
                login('pai');
                dismissToast();
                router.push('/pai/inicio');
              }}
              className="text-[11px] font-semibold text-[#96B5FE] hover:text-white flex items-center gap-1 transition-colors"
            >
              Ver no App do Pai →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

