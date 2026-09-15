'use client';

import React, { useState } from 'react';
import { TeacherListing } from '@/lib/types';
import { useSystem } from '@/lib/context';
import {
  X,
  Send,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Phone,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

interface ContactarProfessorModalProps {
  listing: TeacherListing | null;
  onClose: () => void;
}

export const ContactarProfessorModal: React.FC<ContactarProfessorModalProps> = ({
  listing,
  onClose,
}) => {
  const { currentUser, selectedStudent, students } = useSystem();

  const [studentId, setStudentId] = useState(selectedStudent?.id || students[0]?.id || '');
  const [preferredDays, setPreferredDays] = useState('Segunda e Quarta');
  const [preferredModality, setPreferredModality] = useState(listing?.modality || 'home');
  const [message, setMessage] = useState(
    `Olá Prof. ${listing?.teacherName || ''}, gostaria de solicitar mais informações e agendar uma sessão de explicação para o meu educando.`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!listing) return null;

  const currentStudent = students.find((s) => s.id === studentId) || selectedStudent;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const event = new CustomEvent('alomae-open-chat', {
        detail: {
          teacherUid: listing.teacherUid || listing.teacherId,
          teacherName: listing.teacherName,
          studentId: currentStudent?.id,
          context: 'announcement',
          initialMessage: `[Interesse no anúncio "${listing.title}"]: ${message}`,
        },
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.warn('Erro ao disparar evento de chat:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D1B3D] to-[#143A7B] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white/20 bg-slate-700 shrink-0">
              <img
                src={
                  listing.teacherPhoto ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                }
                alt={listing.teacherName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Mensagem Interna • Alô Mãe
              </span>
              <h3 className="font-['Poppins',sans-serif] font-bold text-base text-white leading-tight">
                {listing.teacherName || 'Docente'}
              </h3>
              <p className="text-xs text-blue-100 truncate max-w-xs">{listing.title}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSent ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h4 className="font-['Poppins',sans-serif] font-bold text-xl text-slate-900">
              Solicitação Enviada com Sucesso!
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              O docente <strong>{listing.teacherName}</strong> foi notificado no seu painel.
              Entrará em contacto direto consigo através do sistema para confirmar a disponibilidade.
            </p>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5 text-slate-600">
              <p>
                <strong className="text-slate-800">Educando:</strong> {currentStudent?.name} ({currentStudent?.className})
              </p>
              <p>
                <strong className="text-slate-800">Disciplina:</strong> {listing.subjectId || 'Explicação'}
              </p>
              <p>
                <strong className="text-slate-800">Honorário de referência:</strong> {listing.price?.toLocaleString()} {listing.currency || 'Kz'} / sessão
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-[#143A7B] hover:bg-[#0D1B3D] text-white py-3 rounded-2xl text-xs font-bold transition-all shadow-md"
            >
              Concluir e Voltar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Quick Listing Summary Pill */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#143A7B]" />
                <span className="font-semibold text-slate-800">
                  {listing.subjectId || 'Disciplina'} • {listing.modality === 'home' ? 'Domiciliar' : listing.modality === 'online' ? 'Online' : 'Na Escola'}
                </span>
              </div>
              <span className="font-bold text-[#143A7B] bg-white px-2.5 py-1 rounded-xl shadow-xs border border-blue-200">
                {listing.price?.toLocaleString()} {listing.currency || 'Kz'} / sessão
              </span>
            </div>

            {/* Select Child */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Para qual dos seus educandos é a explicação?
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.className})
                  </option>
                ))}
              </select>
            </div>

            {/* Modality & Schedule preferences */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Modalidade Preferida
                </label>
                <select
                  value={preferredModality}
                  onChange={(e) => setPreferredModality(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="home">Domiciliar (em casa)</option>
                  <option value="online">Online (remoto)</option>
                  <option value="school">Na escola / colégio</option>
                  <option value="other">Outro local</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dias sugeridos
                </label>
                <input
                  type="text"
                  value={preferredDays}
                  onChange={(e) => setPreferredDays(e.target.value)}
                  placeholder="Ex: Segundas e Quartas"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mensagem ao Professor
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Direct phone call button if teacher allows */}
            {listing.showPhone && listing.contactPhone && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Contacto telefónico direto disponível</p>
                    <p className="text-[11px] text-emerald-600 font-mono">{listing.contactPhone}</p>
                  </div>
                </div>
                <a
                  href={`tel:${listing.contactPhone.replace(/\s+/g, '')}`}
                  className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  Ligar Agora
                </a>
              </div>
            )}

            {/* Privacy notice */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Seus dados de contacto institucional serão transmitidos de forma segura ao docente.
              </span>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'A enviar...' : 'Enviar Solicitação'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
