'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Student,
  AccessLog,
  SchoolNotification,
  MedicalClinic,
  ClassAttendanceStat,
  AttendanceStatus,
  NotificationType,
  UserAccount,
  UserRole,
  Grade,
  StudentMedical,
  Aluno,
  Turma,
  TurmaProfessor,
  MiniPauta,
  NotaAluno,
  PresencaBiometrica,
  GuiaMedica,
  Conversation,
} from './types';
import {
  INITIAL_STUDENTS,
  INITIAL_LOGS,
  INITIAL_NOTIFICATIONS,
  MEDICAL_CLINICS,
  CLASS_STATS,
  MOCK_USERS,
} from './mock-data';
import { audioManager } from './sound';
import {
  seedInitialFirestoreData,
  listenStudents,
  listenAccessLogs,
  listenNotifications,
  listenClassStats,
  listenMedicalClinics,
  listenMiniPautas,
  listenGrades,
  listenConversations,
  INITIAL_CONVERSATIONS,
  createAccessLog as firestoreCreateAccessLog,
  createNotification as firestoreCreateNotification,
  markNotificationAsRead as firestoreMarkNotificationAsRead,
  updateStudent as firestoreUpdateStudent,
  updateGuiaMedica as firestoreUpdateGuiaMedica,
  criarMiniPauta as firestoreCriarMiniPauta,
  salvarNotasMiniPauta as firestoreSalvarNotas,
  submeterMiniPauta as firestoreSubmeterPauta,
  aprovarMiniPauta as firestoreAprovarPauta,
  rejeitarMiniPauta as firestoreRejeitarPauta,
  getUserProfile,
  getTurmas,
  getTurmasProfessores,
} from './firebase-services';

interface SystemContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  login: (emailOrPhone: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isTerminalAuthorized: boolean;
  setTerminalAuthorized: (val: boolean) => void;

  // Real-time Firestore Collections
  students: Student[];
  logs: AccessLog[];
  notifications: SchoolNotification[];
  clinics: MedicalClinic[];
  classStats: ClassAttendanceStat[];
  grades: Grade[];
  alunos: Aluno[];
  turmas: Turma[];
  turmasProfessores: TurmaProfessor[];
  miniPautas: MiniPauta[];
  presencasBiometricas: PresencaBiometrica[];

  // Selected State
  selectedStudent: Student;
  setSelectedStudent: (student: Student) => void;
  activeMedicalGuide: { student: Student; clinic: MedicalClinic; autoPrint?: boolean } | null;
  setActiveMedicalGuide: (guide: { student: Student; clinic: MedicalClinic; autoPrint?: boolean } | null) => void;
  selectedReceiptLog: AccessLog | null;
  setSelectedReceiptLog: (log: AccessLog | null) => void;
  isSimulatingWebcam: boolean;
  setIsSimulatingWebcam: (val: boolean) => void;

  // CRUD Actions
  registerBiometricAccess: (
    studentId: string,
    type: 'entry' | 'exit',
    method: 'facial' | 'fingerprint' | 'manual',
    location?: string
  ) => Promise<AccessLog>;

  sendTeacherNotification: (
    type: NotificationType,
    target: 'all' | string,
    subject: string,
    message: string,
    reunionDate?: string,
    reunionTime?: string
  ) => Promise<void>;

  updateStudentStatus: (studentId: string, status: AttendanceStatus) => Promise<void>;
  updateGuiaMedica: (alunoId: string, guia: GuiaMedica) => Promise<void>;

  // Mini Pautas & Grades
  criarMiniPauta: (pauta: Omit<MiniPauta, 'id' | 'status'>) => Promise<string>;
  salvarNotas: (pautaId: string, notas: NotaAluno[]) => Promise<void>;
  submeterPauta: (pautaId: string) => Promise<void>;
  aprovarPauta: (pautaId: string) => Promise<void>;
  rejeitarPauta: (pautaId: string, motivo?: string) => Promise<void>;

  markNotificationAsRead: (id: string) => Promise<void>;
  unreadCount: number;
  unreadMessagesCount: number;
  unreadAnnouncementsCount: number;
  conversations: Conversation[];
  toastMessage: { title: string; desc: string; type: 'success' | 'info' | 'alert' } | null;
  dismissToast: () => void;
  isFirestoreSyncing: boolean;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('alomae_user');
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return null;
  });

  const [isTerminalAuthorized, setTerminalAuthorized] = useState<boolean>(true);
  const [isFirestoreSyncing, setIsFirestoreSyncing] = useState<boolean>(true);

  // Firestore Real-time Collections
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [logs, setLogs] = useState<AccessLog[]>(INITIAL_LOGS);
  const [notifications, setNotifications] = useState<SchoolNotification[]>(INITIAL_NOTIFICATIONS);
  const [clinics, setClinics] = useState<MedicalClinic[]>(MEDICAL_CLINICS);
  const [classStats, setClassStats] = useState<ClassAttendanceStat[]>(CLASS_STATS);
  const [grades, setGrades] = useState<Grade[]>([]);

  // Legacy & Portuguese helpers
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmasProfessores, setTurmasProfessores] = useState<TurmaProfessor[]>([]);
  const [miniPautas, setMiniPautas] = useState<MiniPauta[]>([]);
  const [presencasBiometricas, setPresencasBiometricas] = useState<PresencaBiometrica[]>([]);

  // Selected state
  const [selectedStudent, setSelectedStudent] = useState<Student>(INITIAL_STUDENTS[0]);
  const [activeMedicalGuide, setActiveMedicalGuide] = useState<{ student: Student; clinic: MedicalClinic; autoPrint?: boolean } | null>(null);
  const [selectedReceiptLog, setSelectedReceiptLog] = useState<AccessLog | null>(null);
  const [isSimulatingWebcam, setIsSimulatingWebcam] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'alert' } | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);

  const unreadMessagesCount = useMemo(() => {
    if (!currentUser) return 0;
    const isTeacher = currentUser.role === 'professor';
    return conversations.reduce((acc, c) => {
      const count = isTeacher ? (c.unreadCountTeacher || 0) : (c.unreadCountGuardian || 0);
      return acc + count;
    }, 0);
  }, [conversations, currentUser]);

  const unreadAnnouncementsCount = useMemo(() => {
    return notifications.filter(
      (n) => !n.isRead && ['new_teacher_listing', 'listing_approved', 'listing_rejected'].includes(n.type)
    ).length;
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const dismissToast = () => setToastMessage(null);

  // Initialize Firestore and Real-time Listeners across all 8 collections
  useEffect(() => {
    let unsubStudents: (() => void) | undefined;
    let unsubLogs: (() => void) | undefined;
    let unsubNotifs: (() => void) | undefined;
    let unsubStats: (() => void) | undefined;
    let unsubClinics: (() => void) | undefined;
    let unsubPautas: (() => void) | undefined;
    let unsubGrades: (() => void) | undefined;
    let unsubConversations: (() => void) | undefined;

    async function initFirestore() {
      setIsFirestoreSyncing(true);
      try {
        await seedInitialFirestoreData();

        // 1. Fetch Turmas and Professores
        const [turmasList, tpList] = await Promise.all([
          getTurmas(),
          getTurmasProfessores(),
        ]);
        setTurmas(turmasList);
        setTurmasProfessores(tpList);

        // 2. Listen to Students
        unsubStudents = listenStudents((firestoreStudents) => {
          if (firestoreStudents.length > 0) {
            setStudents(firestoreStudents);
            const alunosConverted: Aluno[] = firestoreStudents.map((s) => ({
              ...s,
              nome_completo: s.name || s.fullName || 'Aluno',
              turma_id: s.classId === '1a' ? 'turma_10a' : (s.classId || 'turma_10a'),
              encarregado_id: 'user_pai_fernanda',
              foto_biometrica_url: s.photoUrl || '',
              guia_medica: s.guiaMedica || {
                tipagem_sanguinea: 'O+',
                alergias: ['Amendoim', 'Penicilina'],
                tem_seguro: true,
                tipo_seguro: 'Seguro Escolar Completo Plus',
                seguradora: 'ENSA Seguros Angola',
                cobertura_detalhes: 'Internamento, Pronto Socorro Pediátrico 24h',
                numero_apolice: s.insurancePolicyId || 'SEG-ALO-2026-8821',
                contacto_emergencia: s.parentPhone || '+244 923 884 912',
              },
            }));
            setAlunos(alunosConverted);
            setSelectedStudent((prev) => firestoreStudents.find((s) => s.id === prev?.id) || firestoreStudents[0]);
          }
        });

        // 3. Listen to AccessLogs
        unsubLogs = listenAccessLogs((firestoreLogs) => {
          if (firestoreLogs.length > 0) {
            setLogs(firestoreLogs);
            const mappedPresencas: PresencaBiometrica[] = firestoreLogs.map((l) => ({
              ...l,
              aluno_id: l.studentId,
              aluno_nome: l.studentName,
              aluno_foto: l.studentPhoto,
              turma_id: l.classId || 'turma_10a',
              turma_nome: l.className,
              data_hora: new Date().toISOString(),
              tipo: l.type === 'entry' ? 'entrada' : 'saida',
              status_reconhecimento: 'sucesso',
              metodo: l.method,
              localizacao: l.location,
              codigo_recibo: l.receiptCode,
            }));
            setPresencasBiometricas(mappedPresencas);
          }
        });

        // 4. Listen to Notifications
        unsubNotifs = listenNotifications((firestoreNotifs) => {
          if (firestoreNotifs.length > 0) {
            setNotifications(firestoreNotifs);
          }
        });

        // 5. Listen to ClassStats
        unsubStats = listenClassStats((firestoreStats) => {
          if (firestoreStats.length > 0) {
            setClassStats(firestoreStats);
          }
        });

        // 6. Listen to MedicalClinics
        unsubClinics = listenMedicalClinics((firestoreClinics) => {
          if (firestoreClinics.length > 0) {
            setClinics(firestoreClinics);
          }
        });

        // 7. Listen to MiniPautas & Grades
        unsubPautas = listenMiniPautas((firestorePautas) => {
          setMiniPautas(firestorePautas);
        });

        unsubGrades = listenGrades((firestoreGrades) => {
          setGrades(firestoreGrades);
        });
      } catch (err) {
        console.warn('Erro na sincronização Firestore:', err);
      } finally {
        setIsFirestoreSyncing(false);
      }
    }

    initFirestore();

    return () => {
      if (unsubStudents) unsubStudents();
      if (unsubLogs) unsubLogs();
      if (unsubNotifs) unsubNotifs();
      if (unsubStats) unsubStats();
      if (unsubClinics) unsubClinics();
      if (unsubPautas) unsubPautas();
      if (unsubGrades) unsubGrades();
    };
  }, []);

  // Sync current user to local storage
  useEffect(() => {
    if (currentUser && typeof window !== 'undefined') {
      localStorage.setItem('alomae_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Auto dismiss toast after 5s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const login = async (emailOrPhone: string, _password?: string): Promise<boolean> => {
    if (!emailOrPhone || !emailOrPhone.trim()) return false;

    const trimmedInput = emailOrPhone.trim();
    const normalizedInput = trimmedInput.toLowerCase();
    const normalizedDigits = trimmedInput.replace(/\D/g, '');

    // 1. Direct role key check
    let foundUser: UserAccount | undefined = MOCK_USERS[trimmedInput as UserRole];

    // 2. Search in user profiles
    if (!foundUser) {
      foundUser = Object.values(MOCK_USERS).find((user) => {
        const uEmail = user.email.trim().toLowerCase();
        const phoneStr = user.phone || user.telefone || '';
        const uPhone = phoneStr.trim().toLowerCase();
        const uPhoneDigits = phoneStr.replace(/\D/g, '');

        if (uEmail === normalizedInput) return true;
        if (uPhone && uPhone === normalizedInput) return true;
        if (normalizedDigits.length >= 7 && uPhoneDigits.includes(normalizedDigits)) return true;
        return false;
      });
    }

    // Try Firestore profile lookup if not matched
    if (!foundUser && trimmedInput.startsWith('user_')) {
      const p = await getUserProfile(trimmedInput);
      if (p) {
        foundUser = {
          ...p,
          id: p.uid,
          name: p.name || p.nome || '',
          phone: p.phone || p.telefone || '',
          schoolName: p.schoolId === 'school_horizonte_luanda' ? 'Colégio Horizonte de Luanda' : 'Colégio Horizonte de Luanda',
        };
      }
    }

    if (foundUser) {
      setCurrentUser(foundUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('alomae_user', JSON.stringify(foundUser));
      }
      setToastMessage({
        title: `Sessão iniciada como ${foundUser.role.toUpperCase()}`,
        desc: `Bem-vindo(a), ${foundUser.name || foundUser.nome}!`,
        type: 'success',
      });
      return true;
    }

    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('alomae_user');
    }
    setToastMessage({
      title: 'Sessão encerrada',
      desc: 'Você saiu da sua conta com sucesso.',
      type: 'info',
    });
  };

  const registerBiometricAccess = async (
    studentId: string,
    type: 'entry' | 'exit',
    method: 'facial' | 'fingerprint' | 'manual',
    location = 'Guarita Principal — Portaria 1'
  ): Promise<AccessLog> => {
    const student = students.find((s) => s.id === studentId) || students[0];
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const dateStr = now.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
    const receiptCode = `CF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${timeStr.replace(/:/g, '')}-${student.id.toUpperCase()}`;

    const newLog: AccessLog = {
      id: `log-${Date.now()}-${student.id}`,
      studentId: student.id,
      studentName: student.name || student.fullName || 'Aluno',
      studentPhoto: student.photoUrl || 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400',
      className: student.className || 'Turma A',
      schoolId: student.schoolId || 'school_horizonte_luanda',
      schoolName: student.schoolName || 'Colégio Horizonte de Luanda',
      type,
      timestamp: timeStr,
      date: dateStr,
      location,
      method,
      receiptCode,
      notified: true,
      notifiedRecipient: `${student.parentName || 'Encarregado'} (${student.parentPhone || 'SMS'})`,
      statusNote: `${(student.parentName || 'Encarregado').split(' ')[0]} Notificado via SMS / Push`,
    };

    // 1. Write AccessLog to Firestore
    try {
      await firestoreCreateAccessLog(newLog);
    } catch (err) {
      console.warn('Erro ao salvar accessLog no Firestore:', err);
    }

    // 2. Push Notification to Firestore
    const newNotif: SchoolNotification = {
      id: `notif-${Date.now()}`,
      type: type === 'entry' ? 'access_entry' : 'access_exit',
      title: type === 'entry' ? 'Entrada confirmada!' : 'Saída registrada',
      message: `${student.name} ${type === 'entry' ? 'entrou no' : 'saiu do'} ${student.schoolName || 'Colégio'} às ${timeStr.slice(0, 5)} via ${method === 'facial' ? 'Reconhecimento Facial' : method === 'fingerprint' ? 'Biometria Digital' : 'Validação Manual'}.`,
      studentId: student.id,
      studentName: student.name,
      className: student.className,
      schoolId: student.schoolId || 'school_horizonte_luanda',
      senderName: 'Terminal Biométrico Portaria',
      senderRole: 'Sistema Alô mãe',
      date: 'Hoje',
      time: timeStr.slice(0, 5),
      isRead: false,
      receiptCode,
    };

    try {
      await firestoreCreateNotification(newNotif);
    } catch (err) {
      console.warn('Erro ao salvar notificação no Firestore:', err);
    }

    // Audio & UX Feedback
    audioManager.playSuccessChime();
    audioManager.speakConfirmation(student.name, type);

    setToastMessage({
      title: `${type === 'entry' ? 'Entrada' : 'Saída'} Confirmada — Alô mãe`,
      desc: `${student.name} • ${timeStr} • Sincronizado no Firestore`,
      type: 'success',
    });

    return newLog;
  };

  const sendTeacherNotification = async (
    type: NotificationType,
    target: 'all' | string,
    subject: string,
    message: string,
    reunionDate?: string,
    reunionTime?: string
  ) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const targetStudent = target !== 'all' ? students.find((s) => s.id === target) : undefined;

    const titlesMap: Record<NotificationType, string> = {
      reunion: 'Convocação de Reunião de Pais',
      warning: 'Chamada de Atenção Escolar',
      broadcast: 'Comunicado da Turma',
      praise: 'Elogio de Desempenho Escolar',
      access_entry: 'Entrada registrada',
      access_exit: 'Saída registrada',
      medical: 'Guia de Atendimento Médico',
      grade_approved: 'Mini Pauta e Notas Publicadas',
      grade_published: 'Boletim de Notas Publicado',
      mini_report_approved: 'Mini Pauta Homologada',
      mini_report_rejected: 'Mini Pauta Devolvida para Ajuste',
      teacher_message: 'Mensagem do Professor',
      new_teacher_listing: 'Novo Anúncio de Explicações',
      listing_approved: 'Anúncio Docente Homologado',
      listing_rejected: 'Anúncio Docente Recusado',
      medical_guide_issued: 'Guia Médica Emitida',
      medical_guide_updated: 'Atualização de Guia Médica',
    };

    const newNotif: SchoolNotification = {
      id: `notif-${Date.now()}`,
      type,
      title: titlesMap[type] || 'Notificação Escolar',
      subject: subject || (type === 'reunion' ? 'Reunião de Pais' : 'Comunicado Escolar'),
      message: message || 'Mensagem enviada pelo professor.',
      studentId: targetStudent ? targetStudent.id : undefined,
      studentName: targetStudent ? targetStudent.name : 'Todos os Alunos da Turma',
      className: '10ª Classe A',
      schoolId: 'school_horizonte_luanda',
      senderName: currentUser?.name || 'Profª. Maria Fernandes',
      senderRole: 'Professora Titular',
      date: 'Hoje',
      time: timeStr,
      isRead: false,
      reunionDate,
      reunionTime,
    };

    await firestoreCreateNotification(newNotif);
    audioManager.playNotificationPing();

    setToastMessage({
      title: 'Notificação Push Enviada aos Pais!',
      desc: target === 'all' ? 'Enviado para todos os encarregados da turma 10ª Classe A' : `Enviado para os encarregados de ${targetStudent?.name}`,
      type: 'info',
    });
  };

  const updateStudentStatus = async (studentId: string, status: AttendanceStatus) => {
    await firestoreUpdateStudent(studentId, { status });

    if (status === 'absent') {
      const student = students.find((s) => s.id === studentId);
      if (student) {
        const notif: SchoolNotification = {
          id: `notif-absent-${Date.now()}`,
          type: 'warning',
          title: 'Alerta de Falta Registada',
          subject: 'Ausência na Sala de Aula',
          message: `Informamos que o aluno(a) ${student.name} não compareceu à aula no ${student.className}. Caso seja uma falta justificada, contacte a secretaria.`,
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          schoolId: student.schoolId || 'school_horizonte_luanda',
          senderName: currentUser?.name || 'Profª. Maria Fernandes',
          senderRole: 'Controlo de Presenças',
          date: 'Hoje',
          time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
        };
        await firestoreCreateNotification(notif);
        setToastMessage({
          title: 'Alerta de Falta Notificado!',
          desc: `Encarregado de ${student.name} alertado em tempo real no Firestore.`,
          type: 'alert',
        });
      }
    }
  };

  const updateGuiaMedica = async (alunoId: string, guia: GuiaMedica) => {
    await firestoreUpdateGuiaMedica(alunoId, guia);
    setToastMessage({
      title: 'Guia Médica Atualizada!',
      desc: 'Dados de saúde e seguro persistidos no Firestore.',
      type: 'success',
    });
  };

  const criarMiniPauta = async (pauta: Omit<MiniPauta, 'id' | 'status'>) => {
    const id = await firestoreCriarMiniPauta(pauta);
    setToastMessage({
      title: 'Rascunho de Mini Pauta Criado',
      desc: `Pauta para ${pauta.disciplina} salva no Firestore.`,
      type: 'success',
    });
    return id;
  };

  const salvarNotas = async (pautaId: string, notas: NotaAluno[]) => {
    await firestoreSalvarNotas(pautaId, notas);
    setToastMessage({
      title: 'Notas Salvas com Sucesso',
      desc: 'Valores salvos no Firestore com cálculo automático da Média Final.',
      type: 'success',
    });
  };

  const submeterPauta = async (pautaId: string) => {
    await firestoreSubmeterPauta(pautaId);
    setToastMessage({
      title: 'Mini Pauta Submetida para Aprovação',
      desc: 'Enviada para validação da Direção Pedagógica.',
      type: 'info',
    });
  };

  const aprovarPauta = async (pautaId: string) => {
    await firestoreAprovarPauta(pautaId);
    setToastMessage({
      title: 'Mini Pauta Aprovada!',
      desc: 'Notas liberadas para visualização dos encarregados.',
      type: 'success',
    });
  };

  const rejeitarPauta = async (pautaId: string, motivo?: string) => {
    await firestoreRejeitarPauta(pautaId, motivo);
    setToastMessage({
      title: 'Mini Pauta Rejeitada',
      desc: 'Devolvida ao professor com as notas de ajuste.',
      type: 'alert',
    });
  };

  const markNotificationAsRead = async (id: string) => {
    await firestoreMarkNotificationAsRead(id);
  };

  return (
    <SystemContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        isTerminalAuthorized,
        setTerminalAuthorized,
        students,
        logs,
        notifications,
        clinics,
        classStats,
        grades,
        alunos,
        turmas,
        turmasProfessores,
        miniPautas,
        presencasBiometricas,
        selectedStudent,
        setSelectedStudent,
        activeMedicalGuide,
        setActiveMedicalGuide,
        selectedReceiptLog,
        setSelectedReceiptLog,
        isSimulatingWebcam,
        setIsSimulatingWebcam,
        registerBiometricAccess,
        sendTeacherNotification,
        updateStudentStatus,
        updateGuiaMedica,
        criarMiniPauta,
        salvarNotas,
        submeterPauta,
        aprovarPauta,
        rejeitarPauta,
        markNotificationAsRead,
        unreadCount,
        unreadMessagesCount,
        unreadAnnouncementsCount,
        conversations,
        toastMessage,
        dismissToast,
        isFirestoreSyncing,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};
