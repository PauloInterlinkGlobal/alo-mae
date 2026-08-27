'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const MobileAppBridge: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showNetworkBanner, setShowNetworkBanner] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const lastBackPressRef = useRef<number>(0);

  // 1. Initialize Capacitor Plugins and PWA Service Worker
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const initCapacitor = async () => {
      try {
        // Dynamic import so web/SSR never crashes
        const { Capacitor } = await import('@capacitor/core');

        if (Capacitor.isNativePlatform()) {
          // Status bar styling
          try {
            const { StatusBar, Style } = await import('@capacitor/status-bar');
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: '#0D1B3D' });
          } catch {
            // plugin not available or failed
          }

          // Splash screen auto-hide
          try {
            const { SplashScreen } = await import('@capacitor/splash-screen');
            await SplashScreen.hide();
          } catch {
            // plugin not available
          }

          // Android hardware back button handler
          try {
            const { App: CapApp } = await import('@capacitor/app');
            CapApp.addListener('backButton', ({ canGoBack }) => {
              if (pathname === '/pai/inicio' || pathname === '/login' || pathname === '/') {
                const now = Date.now();
                if (now - lastBackPressRef.current < 2000) {
                  CapApp.exitApp();
                } else {
                  lastBackPressRef.current = now;
                  // Optional quick toast alert
                }
              } else if (pathname.startsWith('/pai/') && pathname !== '/pai/inicio') {
                router.push('/pai/inicio');
              } else if (canGoBack) {
                window.history.back();
              } else {
                router.push('/login');
              }
            });
          } catch {
            // App plugin not available
          }

          // Network connectivity monitoring
          try {
            const { Network } = await import('@capacitor/network');
            const status = await Network.getStatus();
            if (isMounted) setIsOnline(status.connected);

            Network.addListener('networkStatusChange', (stat) => {
              if (isMounted) {
                setIsOnline(stat.connected);
                setShowNetworkBanner(true);
                if (stat.connected) {
                  setIsSyncing(true);
                  setTimeout(() => {
                    if (isMounted) {
                      setIsSyncing(false);
                      setTimeout(() => setShowNetworkBanner(false), 3000);
                    }
                  }, 1200);
                }
              }
            });
          } catch {
            // fallback to web events
          }
        }
      } catch (err) {
        console.warn('Capacitor init note:', err);
      }
    };

    initCapacitor();

    // Web Network Listeners fallback
    const handleOnline = () => {
      setIsOnline(true);
      setShowNetworkBanner(true);
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
        setTimeout(() => setShowNetworkBanner(false), 3000);
      }, 1200);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNetworkBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('Alô mãe PWA ServiceWorker registrado'))
        .catch((err) => console.log('SW registration error:', err));
    }

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pathname, router]);

  if (!showNetworkBanner && isOnline) return null;

  return (
    <div
      className={`fixed top-2 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 backdrop-blur-md ${
        !isOnline
          ? 'bg-rose-900/90 text-rose-100 border border-rose-500/30'
          : isSyncing
          ? 'bg-amber-900/90 text-amber-100 border border-amber-500/30'
          : 'bg-emerald-900/90 text-emerald-100 border border-emerald-500/30'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 text-rose-400" />
          <span>Modo Offline • Operação em Cache Local</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          <span>Sincronizando dados escolares...</span>
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>Conectado • Dados em Tempo Real</span>
        </>
      )}
    </div>
  );
};
