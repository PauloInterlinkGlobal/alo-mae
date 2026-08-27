'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, Bell, Shield, User } from 'lucide-react';
import { useSystem } from '@/lib/context';

export const PaiBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { unreadCount } = useSystem();

  const navItems = [
    { label: 'Início', href: '/pai/inicio', icon: Home },
    { label: 'Atividades', href: '/pai/atividades', icon: History },
    {
      label: 'Notificações',
      href: '/pai/notificacoes',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { label: 'Seguro', href: '/pai/seguro', icon: Shield },
    { label: 'Perfil', href: '/pai/perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] px-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-md mx-auto flex items-center justify-around">

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/pai/inicio' && pathname === '/pai');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-[#143A7B] font-semibold scale-105'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.4px]' : 'stroke-[1.8px]'}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 whitespace-nowrap">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#143A7B] mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
