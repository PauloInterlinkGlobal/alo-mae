'use client';

import React, { useState } from 'react';
import { useSystem } from '@/lib/context';
import {
  Send,
  Calendar,
  AlertTriangle,
  Heart,
  MessageSquare,
  Users,
  User,
  Clock,
  CheckCircle2,
  Sparkles,
  History,
} from 'lucide-react';
import { NotificationType } from '@/lib/types';

export default function ProfessorNotificarPage() {
  const { students, sendTeacherNotification, notifications } = useSystem();

  const [notifType, setNotifType] = useState<NotificationType>('reunion');
  const [targetRecipient, setTargetRecipient] = useState<'all' | string>('all');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reunionDate, setReunionDate] = useState('2026-08-28');
  const [reunionTime, setReunionTime] = useState('15:30');
  const [isSentSuccess, setIsSentSuccess] = useState(false);

  const classStudents = students.filter((s) => s.classId === '1a');
  const teacherSentHistory = notifications.filter(
    (n) => n.senderRole === 'Professora Titular' || n.senderName.includes('Maria Fernandes')
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendTeacherNotification(
      notifType,
      targetRecipient,
      subject || (notifType === 'reunion' ? 'Reunião de Pais' : 'Comunicado da Turma'),
      message,
      notifType === 'reunion' ? reunionDate : undefined,
      notifType === 'reunion' ? reunionTime : undefined
    );

    setIsSentSuccess(true);
    setMessage('');
    setSubject('');

    setTimeout(() => {
      setIsSentSuccess(false);
    }, 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-['Poppins',sans-serif] font-bold text-2xl text-[#0D1B3D]">
          Enviar Notificação aos Pais
        </h1>
        <p className="text-sm text-slate-500">
          Dispare avisos, convocações de reuniões, alertas e elogios diretamente para a app dos encarregados
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Panel */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs">
          <form onSubmit={handleSend} className="space-y-5">
            {/* Notification Type Selector Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                1. Selecione o Tipo de Notificação:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setNotifType('reunion')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                    notifType === 'reunion'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-4 h-4 mb-1 text-blue-600" />
                  <span>Reunião</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifType('warning')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                    notifType === 'warning'
                      ? 'bg-white text-rose-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 mb-1 text-rose-600" />
                  <span>Atenção</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifType('broadcast')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                    notifType === 'broadcast'
                      ? 'bg-white text-[#143A7B] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 mb-1 text-[#143A7B]" />
                  <span>Comunicado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifType('praise')}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                    notifType === 'praise'
                      ? 'bg-white text-pink-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Heart className="w-4 h-4 mb-1 text-pink-600" />
                  <span>Elogio</span>
                </button>
              </div>
            </div>

            {/* Target Recipient */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                2. Destinatário:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetRecipient('all')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                    targetRecipient === 'all'
                      ? 'bg-blue-50/70 border-[#143A7B] text-[#143A7B]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Users className="w-4 h-4 text-[#143A7B]" />
                  </div>
                  <div>
                    <p className="font-bold text-xs">Toda a Turma (1º Ano A)</p>
                    <p className="text-[11px] text-slate-500">{classStudents.length} encarregados</p>
                  </div>
                </button>

                <div className="relative">
                  <select
                    value={targetRecipient}
                    onChange={(e) => setTargetRecipient(e.target.value)}
                    className="w-full h-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B] font-medium"
                  >
                    <option value="all">-- Ou selecione um Aluno Específico --</option>
                    {classStudents.map((std) => (
                      <option key={std.id} value={std.id}>
                        {std.name} (Enc: {std.parentName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* If Reunion: Date & Time Picker */}
            {notifType === 'reunion' && (
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0D1B3D] mb-1">
                    Data da Reunião
                  </label>
                  <input
                    type="date"
                    value={reunionDate}
                    onChange={(e) => setReunionDate(e.target.value)}
                    className="w-full p-2 bg-white border border-blue-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0D1B3D] mb-1">
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    value={reunionTime}
                    onChange={(e) => setReunionTime(e.target.value)}
                    className="w-full p-2 bg-white border border-blue-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                3. Assunto da Notificação:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  notifType === 'reunion'
                    ? 'Ex.: Reunião Trimestral de Avaliação Pedagógica'
                    : notifType === 'warning'
                    ? 'Ex.: Alerta de Comportamento / Tarefas Incompletas'
                    : notifType === 'praise'
                    ? 'Ex.: Destaque em Leitura e Expressão Artística'
                    : 'Ex.: Material para a Aula Prática de Ciências'
                }
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                4. Conteúdo da Mensagem Push:
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva a mensagem clara e detalhada para o(s) encarregado(s)..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
              />
            </div>

            {/* Feedback alert */}
            {isSentSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Notificação Push enviada com sucesso aos encarregados!</span>
              </div>
            )}

            {/* Submit CTA */}
            <button
              type="submit"
              className="w-full bg-[#143A7B] hover:bg-[#0D1B3D] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-['Poppins',sans-serif] font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Notificação Push aos Pais</span>
            </button>
          </form>
        </div>

        {/* Right 1 Col: History & Tips */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
            <h3 className="font-['Poppins',sans-serif] font-bold text-sm text-[#0D1B3D] mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-[#143A7B]" />
              <span>Notificações Enviadas Recentemente</span>
            </h3>

            <div className="space-y-3">
              {teacherSentHistory.slice(0, 4).map((hist) => (
                <div
                  key={hist.id}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 truncate max-w-[140px]">
                      {hist.title}
                    </span>
                    <span className="text-[10px] text-slate-400">{hist.time}</span>
                  </div>
                  <p className="text-slate-600 line-clamp-2">{hist.message}</p>
                  <span className="text-[10px] text-[#143A7B] font-medium block">
                    Destino: {hist.studentName || 'Toda a Turma'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
