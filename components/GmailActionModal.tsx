'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sparkles,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import {
  sendEmailViaGmail,
  getGmailProfile,
  GmailProfile,
} from '@/services/gmail.service';
import {
  getCachedGoogleAccessToken,
  loginWithGoogle,
} from '@/services/auth.service';

interface GmailActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipient?: string;
  defaultStudentName?: string;
  defaultSubject?: string;
  defaultMessage?: string;
  onSentSuccess?: (receiptId: string) => void;
}

export const GmailActionModal: React.FC<GmailActionModalProps> = ({
  isOpen,
  onClose,
  defaultRecipient = '',
  defaultStudentName = '',
  defaultSubject = '',
  defaultMessage = '',
  onSentSuccess,
}) => {
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [studentName, setStudentName] = useState(defaultStudentName);
  const [subject, setSubject] = useState(
    defaultSubject || (defaultStudentName ? `Alô Mãe — Notificação Escolar de ${defaultStudentName}` : 'Alô Mãe — Notificação Escolar')
  );
  const [message, setMessage] = useState(defaultMessage);
  const [template, setTemplate] = useState<'attendance' | 'meeting' | 'general'>('attendance');

  const [hasToken, setHasToken] = useState(false);
  const [gmailProfile, setGmailProfile] = useState<GmailProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync defaults when props change
  useEffect(() => {
    if (defaultRecipient) setRecipient(defaultRecipient);
    if (defaultStudentName) {
      setStudentName(defaultStudentName);
      setSubject(`Alô Mãe — Notificação Escolar de ${defaultStudentName}`);
    }
    if (defaultMessage) setMessage(defaultMessage);
  }, [defaultRecipient, defaultStudentName, defaultMessage]);

  // Check token and profile on modal open
  useEffect(() => {
    if (!isOpen) {
      setFeedback(null);
      return;
    }

    const token = getCachedGoogleAccessToken();
    setHasToken(!!token);

    if (token) {
      setIsLoadingProfile(true);
      getGmailProfile()
        .then((profile) => {
          setGmailProfile(profile);
        })
        .finally(() => {
          setIsLoadingProfile(false);
        });
    }
  }, [isOpen]);

  // Template selector
  const applyTemplate = (type: 'attendance' | 'meeting' | 'general') => {
    setTemplate(type);
    const sName = studentName || 'Educando';
    const nowTime = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    if (type === 'attendance') {
      setSubject(`Alô Mãe — Confirmação de Presença de ${sName}`);
      setMessage(
        `Estimado(a) Encarregado(a),\n\nInformamos que o(a) educando(a) ${sName} registou a sua presença através do totem biométrico às ${nowTime} no Colégio Horizonte de Luanda com sucesso.\n\nComprovativo digital gerado com carimbo de autenticidade.\n\nAtenciosamente,\nDireção Pedagógica — Alô Mãe`
      );
    } else if (type === 'meeting') {
      setSubject(`Alô Mãe — Convocatória para Reunião Pedagógica (${sName})`);
      setMessage(
        `Prezado(a) Encarregado(a),\n\nVimos por este meio solicitar a sua presença no colégio para uma breve reunião pedagógica sobre o acompanhamento escolar do(a) educando(a) ${sName}.\n\nPor favor, confirme a sua disponibilidade respondendo a esta mensagem.\n\nCom os melhores cumprimentos,\nCoordenação de Turma`
      );
    } else {
      setSubject(`Alô Mãe — Comunicado Institucional`);
      setMessage(
        `Estimada família,\n\nPartilhamos com todos os encarregados um comunicado oficial referente às próximas atividades escolares e calendário letivo.\n\nEstamos à disposição para qualquer esclarecimento.\n\nColégio Horizonte de Luanda`
      );
    }
  };

  // Connect Google account in-place if not yet connected
  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setFeedback(null);
    try {
      const { accessToken } = await loginWithGoogle('instituicao');
      setHasToken(!!accessToken);
      if (accessToken) {
        const profile = await getGmailProfile();
        setGmailProfile(profile);
        setFeedback({
          type: 'success',
          message: 'Conta Gmail associada com sucesso! Já pode enviar notificações oficiais.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao autorizar o envio via Gmail.',
      });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      setFeedback({ type: 'error', message: 'Por favor, introduza o e-mail de destino do destinatário.' });
      return;
    }
    if (!subject.trim()) {
      setFeedback({ type: 'error', message: 'Por favor, introduza o assunto do e-mail.' });
      return;
    }
    if (!message.trim()) {
      setFeedback({ type: 'error', message: 'Por favor, introduza a mensagem a ser enviada.' });
      return;
    }

    setIsSending(true);
    setFeedback(null);

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #FFFFFF;">
        <div style="background-color: #143A7B; padding: 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">ALÔ MÃE</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #BAE6FD;">Conexão que Cuida • Colégio Horizonte de Luanda</p>
        </div>
        <div style="padding: 24px 28px; color: #1E293B; line-height: 1.6; font-size: 14px;">
          <h2 style="font-size: 16px; color: #0F172A; margin-top: 0; font-weight: 600;">${subject}</h2>
          <div style="white-space: pre-line; margin: 16px 0; color: #334155;">
            ${message}
          </div>
          <div style="margin-top: 24px; padding: 16px; background-color: #F8FAFC; border-radius: 12px; border-left: 4px solid #00D1FF; font-size: 12px; color: #64748B;">
            <strong>Autenticidade Garantida:</strong> Esta mensagem foi transmitida diretamente a partir do sistema institucional integrado Alô Mãe através da API do Gmail.
          </div>
        </div>
        <div style="background-color: #F1F5F9; padding: 16px; text-align: center; font-size: 11px; color: #94A3B8;">
          © ${new Date().getFullYear()} Alô Mãe • Colégio Horizonte de Luanda, Angola
        </div>
      </div>
    `;

    try {
      const result = await sendEmailViaGmail(
        {
          to: recipient.trim(),
          subject: subject.trim(),
          bodyHtml,
          bodyText: message,
          senderName: 'Alô Mãe — Notificações',
        },
        { requireConfirmation: true }
      );

      setFeedback({
        type: 'success',
        message: `E-mail enviado com sucesso via Gmail! Código: ${result.id}`,
      });
      if (onSentSuccess) {
        onSentSuccess(result.id);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao enviar e-mail via Gmail.',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 text-slate-900 animate-scale-up">
        {/* Header */}
        <div className="bg-[#143A7B] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-cyan-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Poppins',sans-serif] font-bold text-base">
                Enviar Comunicação via Gmail
              </h3>
              <p className="text-xs text-blue-200">
                Integração Oficial com Google Workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Gmail Account Status Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold shrink-0">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  {gmailProfile ? gmailProfile.emailAddress : hasToken ? 'Conta Google Conectada' : 'Gmail Não Conectado'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {gmailProfile
                    ? `Pronto para envio • ${gmailProfile.messagesTotal} mensagens na caixa`
                    : hasToken
                    ? 'Token de envio ativo'
                    : 'Autorize o envio de e-mails escolares através do seu Gmail'}
                </p>
              </div>
            </div>

            {!hasToken && (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                {isConnectingGoogle ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                )}
                <span>Conectar Gmail</span>
              </button>
            )}
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-tight">{feedback.message}</span>
            </div>
          )}

          {/* Quick Template Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Modelo Rápido:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyTemplate('attendance')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                  template === 'attendance'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Presença
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('meeting')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                  template === 'meeting'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Convocatória
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('general')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                  template === 'general'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Geral
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSendEmail} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                E-mail do Destinatário (Encarregado):
              </label>
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
                placeholder="ex: encarregado@gmail.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nome do Educando:
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="ex: Lucas Silva"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Assunto:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="Assunto da mensagem"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Conteúdo do E-mail:
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                placeholder="Escreva a mensagem a enviar ao encarregado..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B] resize-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSending || !hasToken}
                className="bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-5 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>A enviar via Gmail...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-cyan-300" />
                    <span>Enviar E-mail Oficial</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
