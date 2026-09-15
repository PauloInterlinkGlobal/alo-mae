'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSystem } from '@/lib/context';
import {
  Conversation,
  ChatMessage,
  ConversationContext,
  Student,
  TurmaProfessor,
  AttachmentType,
} from '@/lib/types';
import {
  listenConversations,
  listenMessages,
  sendChatMessage,
  markChatMessagesAsRead,
  createOrGetConversation,
  getTurmasProfessores,
} from '@/lib/firebase-services';
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  Search,
  Plus,
  ArrowLeft,
  Check,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  User,
  GraduationCap,
  BookOpen,
  Sparkles,
  ChevronRight,
  Shield,
  Clock,
  AlertCircle,
  FileDown,
} from 'lucide-react';

interface FloatingChatWidgetProps {
  defaultRole?: 'pai' | 'professor';
  positionClass?: string;
}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  defaultRole,
  positionClass,
}) => {
  const { currentUser, students, turmas, turmasProfessores } = useSystem();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'chat' | 'new'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Sending state
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState<{
    url: string;
    name: string;
    type: AttachmentType;
  } | null>(null);

  // New conversation form state
  const [newStudentId, setNewStudentId] = useState<string>('');
  const [newTeacherUid, setNewTeacherUid] = useState<string>('');
  const [newTurmaId, setNewTurmaId] = useState<string>('');
  const [newContext, setNewContext] = useState<ConversationContext>('academic');
  const [newInitialMsg, setNewInitialMsg] = useState<string>('');
  const [availableTeachers, setAvailableTeachers] = useState<TurmaProfessor[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current authenticated user identity
  const currentUserId = currentUser?.uid || currentUser?.id || 'user_pai_fernanda';
  const currentUserName = currentUser?.name || currentUser?.nome || 'Utilizador';
  const userRole = (currentUser?.role || defaultRole || 'pai') as 'pai' | 'professor' | 'encarregado';
  const isTeacher = userRole === 'professor';

  // Fallback position according to portal
  const defaultPosition = isTeacher ? 'bottom-6 right-6' : 'bottom-24 right-4 sm:right-6';
  const positionClasses = positionClass || defaultPosition;

  // 1. Listen to user conversations
  useEffect(() => {
    const unsub = listenConversations(currentUserId, (data) => {
      setConversations(data);
    });
    return () => unsub();
  }, [currentUserId]);

  // 2. Listen to active conversation messages
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    const unsub = listenMessages(activeConversation.id, (msgs) => {
      setMessages(msgs);
    });

    // Mark messages as read
    markChatMessagesAsRead(activeConversation.id, currentUserId, userRole);

    return () => unsub();
  }, [activeConversation, currentUserId, userRole]);

  // 3. Scroll to bottom when messages change
  useEffect(() => {
    if (activeTab === 'chat' && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // 4. Listen for custom window event to open chat directly
  useEffect(() => {
    const handleOpenChatEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        teacherUid?: string;
        teacherName?: string;
        studentId?: string;
        context?: ConversationContext;
        initialMessage?: string;
      }>;

      if (customEvent.detail) {
        setIsOpen(true);
        if (customEvent.detail.teacherUid) {
          // Open or create conversation
          handleInitiateDirectChat(customEvent.detail);
        } else {
          setActiveTab('list');
        }
      }
    };

    window.addEventListener('alomae-open-chat', handleOpenChatEvent);
    return () => window.removeEventListener('alomae-open-chat', handleOpenChatEvent);
  }, [students, turmasProfessores, currentUserId, currentUserName]);

  // Load available teachers for new conversation
  useEffect(() => {
    let isMounted = true;
    async function loadTeachers() {
      if (turmasProfessores && turmasProfessores.length > 0) {
        if (isMounted) setAvailableTeachers(turmasProfessores);
      } else {
        const list = await getTurmasProfessores();
        if (isMounted) setAvailableTeachers(list);
      }
    }
    loadTeachers();
    return () => {
      isMounted = false;
    };
  }, [turmasProfessores]);

  const effectiveStudentId = newStudentId || students[0]?.id || '';
  const effectiveTurmaId = newTurmaId || turmas[0]?.id || '';

  // Calculate unread badge count
  const unreadCount = useMemo(() => {
    return conversations.reduce((acc, conv) => {
      if (isTeacher) {
        return acc + (conv.unreadCountTeacher || 0);
      } else {
        return acc + (conv.unreadCountGuardian || 0);
      }
    }, 0);
  }, [conversations, isTeacher]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const term = searchTerm.toLowerCase();
    return conversations.filter((c) => {
      const tName = c.teacherName?.toLowerCase() || '';
      const gName = c.guardianName?.toLowerCase() || '';
      const sName = c.studentName?.toLowerCase() || '';
      const subName = c.subjectName?.toLowerCase() || '';
      const lastMsg = c.lastMessage?.toLowerCase() || '';
      return (
        tName.includes(term) ||
        gName.includes(term) ||
        sName.includes(term) ||
        subName.includes(term) ||
        lastMsg.includes(term)
      );
    });
  }, [conversations, searchTerm]);

  // Handle initiate direct chat from external components (e.g. Anúncios)
  const handleInitiateDirectChat = async (detail: {
    teacherUid?: string;
    teacherName?: string;
    studentId?: string;
    context?: ConversationContext;
    initialMessage?: string;
  }) => {
    const student = students.find((s) => s.id === detail.studentId) || students[0];
    const teacherName = detail.teacherName || 'Docente Responsável';

    const conv = await createOrGetConversation({
      teacherUid: detail.teacherUid || 'user_prof_maria',
      teacherName,
      guardianUid: currentUserId,
      guardianName: currentUserName,
      studentId: student?.id || 'std_lucas_silva',
      studentName: student?.name || student?.fullName || 'Educando',
      studentClass: student?.className || '10ª Classe',
      context: detail.context || 'announcement',
      initialMessage: detail.initialMessage,
      senderRole: 'pai',
    });

    setActiveConversation(conv);
    setActiveTab('chat');
  };

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachment) || !activeConversation || isSending) return;

    setIsSending(true);
    const textToSend = inputText.trim();
    const attToSend = attachment;

    setInputText('');
    setAttachment(null);

    try {
      await sendChatMessage(activeConversation.id, activeConversation, {
        senderUid: currentUserId,
        senderName: currentUserName,
        senderRole: isTeacher ? 'professor' : 'pai',
        text: textToSend,
        attachmentUrl: attToSend?.url,
        attachmentType: attToSend?.type,
        attachmentName: attToSend?.name,
      });
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle File Upload (Simulated with DataURL / ObjectURL for instant responsive preview)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: AttachmentType = 'document';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.includes('pdf')) type = 'pdf';

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        url: reader.result as string,
        name: file.name,
        type,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Start New Conversation
  const handleStartNewConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInitialMsg.trim()) return;

    let targetTeacherUid = newTeacherUid;
    let targetTeacherName = 'Profª. Maria Fernandes';
    let targetGuardianUid = currentUserId;
    let targetGuardianName = currentUserName;
    let targetStudent = students.find((s) => s.id === effectiveStudentId) || students[0];
    let subjectName = 'Acompanhamento Escolar';

    if (isTeacher) {
      targetTeacherUid = currentUserId;
      targetTeacherName = currentUserName;
      targetGuardianUid = targetStudent?.parentUid || 'user_pai_fernanda';
      targetGuardianName = targetStudent?.parentName || 'Encarregado de Educação';
    } else {
      const foundTeacher = availableTeachers.find(
        (t) => t.professor_id === targetTeacherUid || t.id === targetTeacherUid
      );
      if (foundTeacher) {
        targetTeacherName = foundTeacher.professor_nome || 'Docente Responsável';
        subjectName = foundTeacher.disciplina || 'Acompanhamento Escolar';
      } else {
        targetTeacherUid = 'user_prof_maria';
        targetTeacherName = 'Profª. Maria Fernandes';
        subjectName = 'Matemática';
      }
    }

    try {
      const conv = await createOrGetConversation({
        teacherUid: targetTeacherUid,
        teacherName: targetTeacherName,
        guardianUid: targetGuardianUid,
        guardianName: targetGuardianName,
        studentId: targetStudent?.id || 'std_lucas_silva',
        studentName: targetStudent?.name || targetStudent?.fullName || 'Lucas Silva',
        studentClass: targetStudent?.className || '10ª Classe A',
        subjectName,
        context: newContext,
        initialMessage: newInitialMsg.trim(),
        senderRole: isTeacher ? 'professor' : 'pai',
      });

      setNewInitialMsg('');
      setActiveConversation(conv);
      setActiveTab('chat');
    } catch (err) {
      console.error('Erro ao iniciar conversa:', err);
    }
  };

  // Helper context badge
  const renderContextBadge = (ctx: ConversationContext) => {
    switch (ctx) {
      case 'academic':
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">Académico</span>;
      case 'medical':
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">Saúde</span>;
      case 'announcement':
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">Aulas Particulares</span>;
      case 'student':
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">Comportamento</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-full">Geral</span>;
    }
  };

  return (
    <>
      {/* 1. Floating Trigger Button (Float Bottom) */}
      <div className={`fixed z-40 ${positionClasses}`}>
        <button
          id="chat-floating-button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#0D1B3D] to-[#143A7B] text-white shadow-xl shadow-blue-900/30 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none border-2 border-white/30 group"
          title="Chat Interno: Professor ↔ Encarregado"
          aria-label="Abrir Chat Interno"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
          ) : (
            <MessageSquare className="w-6 h-6 transition-transform group-hover:scale-110 duration-200" />
          )}

          {/* Unread Message Badge */}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-bold text-white bg-rose-600 border-2 border-white rounded-full animate-pulse shadow-md">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. Floating Chat Window / Modal */}
      {isOpen && (
        <div
          id="chat-floating-modal"
          className="fixed z-50 bottom-24 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[410px] h-[560px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200 font-['Inter',sans-serif]"
        >
          {/* Top Header */}
          <div className="bg-gradient-to-r from-[#0D1B3D] to-[#143A7B] text-white p-4 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              {activeTab !== 'list' && (
                <button
                  onClick={() => {
                    if (activeTab === 'chat') {
                      setActiveConversation(null);
                    }
                    setActiveTab('list');
                  }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Voltar para a lista"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {activeTab === 'chat' && activeConversation ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-700 border border-white/20 shrink-0">
                    <img
                      src={
                        isTeacher
                          ? activeConversation.guardianPhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
                          : activeConversation.teacherPhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
                      }
                      alt="Participante"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-white truncate leading-tight">
                      {isTeacher ? activeConversation.guardianName : activeConversation.teacherName}
                    </h4>
                    <p className="text-[11px] text-blue-200 truncate flex items-center gap-1 mt-0.5">
                      <GraduationCap className="w-3 h-3 shrink-0" />
                      <span>{activeConversation.studentName}</span>
                      {activeConversation.subjectName && (
                        <span>• {activeConversation.subjectName}</span>
                      )}
                    </p>
                  </div>
                </div>
              ) : activeTab === 'new' ? (
                <div>
                  <h4 className="font-bold text-sm text-white">Nova Conversa</h4>
                  <p className="text-[11px] text-blue-200">Vinculada estritamente ao educando</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/30 flex items-center justify-center text-blue-300">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white leading-tight">Chat Escolar</h4>
                    <p className="text-[11px] text-blue-200 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      Comunicação Segura & Auditada
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {activeTab === 'list' && (
                <button
                  onClick={() => setActiveTab('new')}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 text-xs font-semibold flex items-center gap-1 border border-blue-400/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors ml-1"
                aria-label="Fechar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
            {/* VIEW 1: CONVERSATION LIST */}
            {activeTab === 'list' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search Bar */}
                <div className="p-3 bg-white border-b border-slate-200">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Pesquisar docente, encarregado ou aluno..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 transition-colors"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* List of Conversations */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-medium text-slate-600">Nenhuma conversa encontrada</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Inicie um canal seguro entre professor e encarregado vinculado ao educando.
                      </p>
                      <button
                        onClick={() => setActiveTab('new')}
                        className="px-3.5 py-1.5 bg-[#0D1B3D] text-white text-xs font-semibold rounded-xl hover:bg-[#143A7B] transition-colors"
                      >
                        Iniciar Primeira Conversa
                      </button>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => {
                      const otherPartyName = isTeacher ? conv.guardianName : conv.teacherName;
                      const otherPartyPhoto = isTeacher ? conv.guardianPhoto : conv.teacherPhoto;
                      const unread = isTeacher ? conv.unreadCountTeacher || 0 : conv.unreadCountGuardian || 0;

                      let formattedTime = '';
                      if (conv.lastMessageAt) {
                        try {
                          const dateObj = new Date(conv.lastMessageAt);
                          const isToday = new Date().toDateString() === dateObj.toDateString();
                          formattedTime = isToday
                            ? dateObj.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
                            : dateObj.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' });
                        } catch {
                          formattedTime = '';
                        }
                      }

                      return (
                        <div
                          key={conv.id}
                          onClick={() => {
                            setActiveConversation(conv);
                            setActiveTab('chat');
                          }}
                          className={`p-3.5 flex items-start gap-3 hover:bg-white cursor-pointer transition-colors ${
                            unread > 0 ? 'bg-blue-50/40' : 'bg-transparent'
                          }`}
                        >
                          <div className="relative w-11 h-11 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                            <img
                              src={
                                otherPartyPhoto ||
                                (isTeacher
                                  ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
                                  : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150')
                              }
                              alt={otherPartyName}
                              className="w-full h-full object-cover"
                            />
                            {unread > 0 && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-600 rounded-full border-2 border-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <h5 className={`text-xs font-semibold text-slate-900 truncate ${unread > 0 ? 'font-bold text-blue-900' : ''}`}>
                                {otherPartyName}
                              </h5>
                              <span className="text-[10px] text-slate-400 shrink-0">{formattedTime}</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                              <span className="inline-flex items-center gap-0.5 text-blue-700 font-medium bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">
                                <GraduationCap className="w-2.5 h-2.5" />
                                {conv.studentName}
                              </span>
                              {conv.subjectName && (
                                <span className="text-slate-400 truncate">• {conv.subjectName}</span>
                              )}
                            </div>

                            <p className={`text-xs truncate ${unread > 0 ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                              {conv.lastMessage || 'Conversa iniciada'}
                            </p>
                          </div>

                          {unread > 0 && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 self-center">
                              {unread}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: ACTIVE CHAT CONVERSATION */}
            {activeTab === 'chat' && activeConversation && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Context banner */}
                <div className="px-3.5 py-2 bg-slate-100/90 border-b border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Educando:</span>
                    <strong className="text-slate-900">{activeConversation.studentName}</strong>
                    <span className="text-slate-400">({activeConversation.studentClass})</span>
                  </div>
                  {renderContextBadge(activeConversation.context)}
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                  {messages.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      <p className="font-medium text-slate-600">Canal de comunicação iniciado</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Envie uma mensagem abaixo sobre as atividades, assiduidade ou desempenho do educando.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderUid === currentUserId || (isTeacher && msg.senderRole === 'professor') || (!isTeacher && msg.senderRole === 'pai');

                      let timeDisplay = '';
                      if (msg.createdAt) {
                        try {
                          const dateObj = new Date(msg.createdAt?.toDate ? msg.createdAt.toDate() : msg.createdAt);
                          timeDisplay = dateObj.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
                        } catch {
                          timeDisplay = '';
                        }
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl p-3 shadow-xs text-xs ${
                              isMe
                                ? 'bg-[#143A7B] text-white rounded-br-xs'
                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                            }`}
                          >
                            {/* Sender name for context */}
                            {!isMe && (
                              <p className="text-[10px] font-bold text-blue-600 mb-1">
                                {msg.senderName || 'Participante'}
                              </p>
                            )}

                            {/* Text content */}
                            {msg.text && (
                              <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                            )}

                            {/* Attachment rendering */}
                            {msg.attachmentUrl && (
                              <div className="mt-2 pt-2 border-t border-white/20">
                                {msg.attachmentType === 'image' ? (
                                  <div className="rounded-lg overflow-hidden max-h-48 border border-black/10">
                                    <img
                                      src={msg.attachmentUrl}
                                      alt={msg.attachmentName || 'Anexo'}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <a
                                    href={msg.attachmentUrl}
                                    download={msg.attachmentName || 'documento'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`flex items-center gap-2 p-2 rounded-lg text-[11px] font-medium transition-colors ${
                                      isMe ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <FileText className="w-4 h-4 shrink-0" />
                                    <span className="truncate flex-1">{msg.attachmentName || 'Documento'}</span>
                                    <FileDown className="w-3.5 h-3.5 shrink-0 opacity-75" />
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Message Status & Timestamp */}
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                isMe ? 'text-blue-200' : 'text-slate-400'
                              }`}
                            >
                              <span>{timeDisplay}</span>
                              {isMe && (
                                <span title={msg.read ? "Lida" : "Enviada"}>
                                  {msg.read ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 opacity-80" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attachment Preview if pending */}
                {attachment && (
                  <div className="p-2 bg-blue-50/80 border-t border-blue-100 flex items-center justify-between text-xs px-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {attachment.type === 'image' ? (
                        <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                      <span className="truncate text-slate-700 font-medium">{attachment.name}</span>
                    </div>
                    <button
                      onClick={() => setAttachment(null)}
                      className="p-1 hover:bg-blue-100 rounded text-slate-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Input Area */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    title="Anexar ficheiro (imagem ou PDF)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    placeholder="Escreva uma mensagem..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 transition-colors"
                  />

                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !attachment) || isSending}
                    className="p-2.5 rounded-xl bg-[#143A7B] text-white hover:bg-[#0D1B3D] disabled:opacity-40 disabled:hover:bg-[#143A7B] transition-colors shadow-xs"
                    aria-label="Enviar mensagem"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* VIEW 3: NEW CONVERSATION (Strictly Bound to Student) */}
            {activeTab === 'new' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-200/70 text-xs text-blue-900 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Shield className="w-4 h-4 text-blue-700" />
                    Regra Institucional de Segurança
                  </div>
                  O chat só é autorizado entre o encarregado e os docentes que leccionam directamente ao seu educando.
                </div>

                <form onSubmit={handleStartNewConversation} className="space-y-3.5">
                  {/* Step 1: Select Student */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isTeacher ? 'Aluno da sua turma:' : 'Selecione o seu Educando:'}
                    </label>
                    <select
                      value={effectiveStudentId}
                      onChange={(e) => setNewStudentId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-800"
                    >
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name || st.fullName} • {st.className || 'Turma Atribuída'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2: Select Teacher (if Parent) */}
                  {!isTeacher && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Professor / Disciplina:
                      </label>
                      <select
                        value={newTeacherUid}
                        onChange={(e) => setNewTeacherUid(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-800"
                      >
                        <option value="user_prof_maria">Profª. Maria Fernandes — Matemática (10ª A)</option>
                        <option value="user_prof_joao">Prof. João Kuanza — História de Angola (10ª A)</option>
                        <option value="user_prof_carlos">Prof. Carlos Manuel — Física & Química (10ª A)</option>
                        {availableTeachers
                          .filter(
                            (t) =>
                              t.professor_id !== 'user_prof_maria' &&
                              t.professor_id !== 'user_prof_joao'
                          )
                          .map((t) => (
                            <option key={t.id} value={t.professor_id}>
                              {t.professor_nome} — {t.disciplina} ({t.turma_nome})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Step 3: Context */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contexto da Comunicação:
                    </label>
                    <select
                      value={newContext}
                      onChange={(e) => setNewContext(e.target.value as ConversationContext)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-800"
                    >
                      <option value="academic">Dúvidas Académicas / Trabalhos</option>
                      <option value="student">Comportamento & Frequência</option>
                      <option value="medical">Saúde e Seguro Escolar</option>
                      <option value="announcement">Aulas Particulares e Explicação</option>
                      <option value="general">Acompanhamento Geral</option>
                    </select>
                  </div>

                  {/* Step 4: Initial Message */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mensagem Inicial:
                    </label>
                    <textarea
                      rows={3}
                      value={newInitialMsg}
                      onChange={(e) => setNewInitialMsg(e.target.value)}
                      placeholder="Escreva a sua mensagem para abrir a conversa..."
                      className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-800 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('list')}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!newInitialMsg.trim()}
                      className="flex-1 py-2.5 bg-[#0D1B3D] text-white hover:bg-[#143A7B] disabled:opacity-50 rounded-xl text-xs font-semibold transition-colors shadow-xs"
                    >
                      Iniciar Conversa
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
export default FloatingChatWidget;
