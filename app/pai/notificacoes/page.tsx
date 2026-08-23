'use client';

import React, { useState } from 'react';
import { useSystem } from '@/lib/context';
import {
  Bell,
  CheckCheck,
  Calendar,
  AlertTriangle,
  Heart,
  MessageSquare,
  DoorOpen,
  DoorClosed,
  Clock,
  User,
  ShieldAlert,
} from 'lucide-react';
import { SchoolNotification } from '@/lib/types';

export default function PaiNotificacoesPage() {
  const { notifications, markNotificationAsRead, setSelectedReceiptLog, logs } = useSystem();
  const [activeTab, setActiveTab] = useState<'all' | 'access' | 'messages' | 'reunions'>('all');

  const filteredNotifs = notifications.filter((n) => {
    if (activeTab === 'access') return n.type === 'access_entry' || n.type === 'access_exit';
    if (activeTab === 'messages') return n.type === 'warning' || n.type === 'praise' || n.type === 'broadcast';
    if (activeTab === 'reunions') return n.type === 'reunion';
    return true;
  });

  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!n.isRead) markNotificationAsRead(n.id);
    });
  };

  const getNotifIcon = (type: SchoolNotification['type']) => {
    switch (type) {
      case 'access_entry':
        return <DoorOpen className="w-5 h-5 text-emerald-600" />;
      case 'access_exit':
        return <DoorClosed className="w-5 h-5 text-amber-600" />;
      case 'reunion':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'praise':
        return <Heart className="w-5 h-5 text-pink-600" />;
      default:
        return <MessageSquare className="w-5 h-5 text-[#143A7B]" />;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-xl text-[#0D1B3D]">
            Notificações & Avisos
          </h1>
          <p className="text-xs text-slate-500">
            Comunicações em tempo real da escola e registos de acesso
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-1 text-xs font-semibold text-[#143A7B] hover:text-[#0D1B3D] bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Marcar lidas</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'all'
              ? 'bg-[#143A7B] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todas ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('access')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'access'
              ? 'bg-[#143A7B] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Entradas/Saídas
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'messages'
              ? 'bg-[#143A7B] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Recados dos Professores
        </button>
        <button
          onClick={() => setActiveTab('reunions')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'reunions'
              ? 'bg-[#143A7B] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Reuniões
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length > 0 ? (
          filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markNotificationAsRead(notif.id)}
              className={`rounded-2xl p-4 border transition-all cursor-pointer ${
                notif.isRead
                  ? 'bg-white border-slate-200 text-slate-700'
                  : 'bg-blue-50/70 border-blue-200 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    notif.isRead ? 'bg-slate-100' : 'bg-white shadow-xs border border-blue-100'
                  }`}
                >
                  {getNotifIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-['Poppins',sans-serif] font-bold text-xs sm:text-sm text-[#0D1B3D] truncate">
                      {notif.title}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {notif.date} • {notif.time}
                      </span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                  </div>

                  {notif.subject && (
                    <p className="text-xs font-semibold text-[#143A7B] mb-1">
                      Assunto: {notif.subject}
                    </p>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                    {notif.message}
                  </p>

                  {/* Reunion date highlights */}
                  {notif.reunionDate && (
                    <div className="bg-white/80 border border-blue-200 rounded-xl p-2.5 text-xs text-[#0D1B3D] font-medium flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>
                        Data marcada: <strong>{notif.reunionDate}</strong> às{' '}
                        <strong>{notif.reunionTime || '15:00'}</strong>
                      </span>
                    </div>
                  )}

                  {/* Sender signature */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{notif.senderName} ({notif.senderRole})</span>
                    </span>
                    {notif.studentName && (
                      <span className="text-slate-400 truncate max-w-[140px]">
                        Ref: {notif.studentName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Sem notificações nesta categoria</p>
            <p className="text-xs text-slate-400 mt-1">Você está atualizado com todos os avisos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
