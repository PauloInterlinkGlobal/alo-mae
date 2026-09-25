'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 5000 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', title: title || 'Sucesso', message });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', title: title || 'Erro de Autenticação', message, duration: 6500 });
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', title: title || 'Informação', message });
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', title: title || 'Atenção', message });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-9999 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto rounded-2xl p-4 shadow-xl border flex items-start gap-3 backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 duration-200 ${
                isError
                  ? 'bg-rose-900/95 border-rose-700/80 text-white shadow-rose-950/40'
                  : isSuccess
                  ? 'bg-emerald-900/95 border-emerald-700/80 text-white shadow-emerald-950/40'
                  : isWarning
                  ? 'bg-amber-900/95 border-amber-700/80 text-white shadow-amber-950/40'
                  : 'bg-slate-900/95 border-slate-700/80 text-white shadow-slate-950/40'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isError && <AlertCircle className="w-5 h-5 text-rose-300" />}
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-300" />}
                {!isError && !isSuccess && !isWarning && <Info className="w-5 h-5 text-blue-300" />}
              </div>

              <div className="flex-1 text-xs">
                {toast.title && <p className="font-bold text-sm leading-tight mb-0.5">{toast.title}</p>}
                <p className="text-white/90 leading-relaxed font-normal">{toast.message}</p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-white/60 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Fechar notificação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
