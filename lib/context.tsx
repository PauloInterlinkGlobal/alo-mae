'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  Aluno,
  Turma,
  TurmaProfessor,
  MiniPauta,
  NotaAluno,
  PresencaBiometrica,
  GuiaMedica,
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
  listenAlunos,
  listenPresencasRecentes,
  listenMiniPautas,
  registarPresencaBiometrica as firestoreRegisterPresenca,
  updateGuiaMedica as firestoreUpdateGuiaMedica,
  criarMiniPauta as firestoreCriarMiniPauta,
  salvarNotasMiniPauta as firestoreSalvarNotas,
  submeterMiniPauta as firestoreSubmeterPauta,
  aprovarMiniPauta as firestoreAprovarPauta,
  rejeitarMiniPauta as firestoreRejeitarPauta,
  getUserProfile,
  updateUserProfile as firestoreUpdateProfile,
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

  // Real-time Firestore Entities
  alunos: Aluno[];
  turmas: Turma[];
  turmasProfessores: TurmaProfessor[];
  miniPautas: MiniPauta[];
  presencasBiometricas: PresencaBiometrica[];

  // Legacy & View Compatibility
  students: Student[];
  logs: AccessLog[];
  notifications: SchoolNotification[];
  clinics: MedicalClinic[];
  classStats: ClassAttendanceStat[];
  selectedStudent: Student;
  setSelectedStudent: (student: Student) => void;
  activeMedicalGuide: { student: Student; clinic: MedicalClinic } | null;
  setActiveMedicalGuide: (guide: { student: Student; clinic: MedicalClinic } | null) => void;
  selectedReceiptLog: AccessLog | null;
  setSelectedReceiptLog: (log: AccessLog | null) => void;
  isSimulatingWebcam: boolean;
  setIsSimulatingWebcam: (val: boolean) => void;

  // Actions directly wired to Firestore
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
  ) => void;

  updateStudentStatus: (studentId: string, status: AttendanceStatus) => void;
  updateGuiaMedica: (alunoId: string, guia: GuiaMedica) => Promise<void>;

  // Mini Pautas Operations (Professor & Direção)
  criarMiniPauta: (pauta: Omit<MiniPauta, 'id' | 'status'>) => Promise<string>;
  salvarNotas: (pautaId: string, notas: NotaAluno[]) => Promise<void>;
  submeterPauta: (pautaId: string) => Promise<void>;
  aprovarPauta: (pautaId: string) => Promise<void>;
  rejeitarPauta: (pautaId: string, motivo?: string) => Promise<void>;

  markNotificationAsRead: (id: string) => void;
  unreadCount: number;
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
    return MOCK_USERS.pai;
  });

  const [isTerminalAuthorized, setTerminalAuthorized] = useState<boolean>(true);
  const [isFirestoreSyncing, setIsFirestoreSyncing] = useState<boolean>(true);

  // Firestore Real-time Collections
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmasProfessores, setTurmasProfessores] = useState<TurmaProfessor[]>([]);
  const [miniPautas, setMiniPautas] = useState<MiniPauta[]>([]);
  const [presencasBiometricas, setPresencasBiometricas] = useState<PresencaBiometrica[]>([]);

  // UI state
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [logs, setLogs] = useState<AccessLog[]>(INITIAL_LOGS);
  const [notifications, setNotifications] = useState<SchoolNotification[]>(INITIAL_NOTIFICATIONS);
  const [clinics] = useState<MedicalClinic[]>(MEDICAL_CLINICS);
  const [classStats, setClassStats] = useState<ClassAttendanceStat[]>(CLASS_STATS);
  const [selectedStudent, setSelectedStudent] = useState<Student>(INITIAL_STUDENTS[0]);
  const [activeMedicalGuide, setActiveMedicalGuide] = useState<{ student: Student; clinic: MedicalClinic } | null>(null);
  const [selectedReceiptLog, setSelectedReceiptLog] = useState<AccessLog | null>(null);
  const [isSimulatingWebcam, setIsSimulatingWebcam] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'alert' } | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const dismissToast = () => setToastMessage(null);

  // Convert Firestore Aluno to UI Student format
  const mapAlunoToStudent = useCallback((a: Aluno): Student => {
    return {
      id: a.id,
      matricula: a.matricula || `MAT-${a.id.slice(-5)}`,
      name: a.nome_completo,
      classId: a.turma_id === 'turma_10a' ? '1a' : a.turma_id,
      className: a.turma_id === 'turma_10a' ? '10ª Classe A' : a.turma_id === 'turma_10b' ? '10ª Classe B' : '11ª Classe A',
      schoolName: 'Colégio Horizonte de Luanda',
      parentName: a.encarregado_id === 'user_pai_fernanda' ? 'Fernanda Silva' : 'Encarregado(a)',
      parentPhone: a.encarregado_id === 'user_pai_fernanda' ? '+244 923 884 912' : '+244 924 551 092',
      parentEmail: a.encarregado_id === 'user_pai_fernanda' ? 'fernanda.silva@email.com' : 'encarregado@email.com',
      photoUrl: a.foto_biometrica_url || 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400',
      status: a.status_presenca || 'present',
      lastEntryTime: a.ultimo_acesso ? new Date(a.ultimo_acesso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '07:32',
      biometricCode: a.biometric_code || `BIO-${a.id.toUpperCase()}`,
      insurancePolicyId: a.guia_medica?.numero_apolice || 'SEG-ALO-2026-8821',
      guiaMedica: a.guia_medica,
    };
  }, []);

  // Initialize Firestore and Real-time Listeners
  useEffect(() => {
    let unsubscribeAlunos: (() => void) | undefined;
    let unsubscribePresencas: (() => void) | undefined;
    let unsubscribePautas: (() => void) | undefined;

    async function initFirestore() {
      setIsFirestoreSyncing(true);
      try {
        await seedInitialFirestoreData();

        // Fetch Turmas & Professores
        const [turmasList, tpList] = await Promise.all([
          getTurmas(),
          getTurmasProfessores(),
        ]);
        setTurmas(turmasList);
        setTurmasProfessores(tpList);

        // Listen to Alunos
        unsubscribeAlunos = listenAlunos((firestoreAlunos) => {
          if (firestoreAlunos.length > 0) {
            setAlunos(firestoreAlunos);
            const mappedStudents = firestoreAlunos.map(mapAlunoToStudent);
            setStudents(mappedStudents);
            setSelectedStudent((prev) => mappedStudents.find((s) => s.id === prev.id) || mappedStudents[0]);
          }
        });

        // Listen to Presenças Biométricas
        unsubscribePresencas = listenPresencasRecentes((firestorePresencas) => {
          if (firestorePresencas.length > 0) {
            setPresencasBiometricas(firestorePresencas);
            const mappedLogs: AccessLog[] = firestorePresencas.map((p) => {
              const d = new Date(p.data_hora);
              return {
                id: p.id,
                studentId: p.aluno_id,
                studentName: p.aluno_nome || 'Aluno',
                studentPhoto: p.aluno_foto || 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400',
                className: p.turma_nome || '10ª Classe A',
                schoolName: 'Colégio Horizonte de Luanda',
                type: p.tipo === 'entrada' ? 'entry' : 'exit',
                timestamp: d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                date: d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }),
                location: p.localizacao || 'Portaria Principal',
                method: (p.metodo as 'facial' | 'fingerprint' | 'manual') || 'facial',
                receiptCode: p.codigo_recibo || `REC-${p.id}`,
                notified: true,
                notifiedRecipient: 'Encarregado Notificado',
                statusNote: 'Registado via Totem Biométrico',
              };
            });
            setLogs(mappedLogs);
          }
        });

        // Listen to Mini Pautas
        unsubscribePautas = listenMiniPautas((firestorePautas) => {
          setMiniPautas(firestorePautas);
        });
      } catch (err) {
        console.warn('Erro na sincronização Firestore:', err);
      } finally {
        setIsFirestoreSyncing(false);
      }
    }

    initFirestore();

    return () => {
      if (unsubscribeAlunos) unsubscribeAlunos();
      if (unsubscribePresencas) unsubscribePresencas();
      if (unsubscribePautas) unsubscribePautas();
    };
  }, [mapAlunoToStudent]);

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

    // 2. Search in mock users or Firestore profiles
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
          name: p.nome,
          phone: p.telefone,
          schoolName: p.escola_nome || 'Colégio Horizonte de Luanda',
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

    // 1. Write directly to Firestore `presencas_biometricas`
    try {
      await firestoreRegisterPresenca({
        aluno_id: student.id,
        aluno_nome: student.name,
        aluno_foto: student.photoUrl,
        turma_id: student.classId === '1a' ? 'turma_10a' : student.classId,
        turma_nome: student.className,
        data_hora: now.toISOString(),
        tipo: type === 'entry' ? 'entrada' : 'saida',
        status_reconhecimento: 'sucesso',
        metodo: method,
        localizacao: location,
        codigo_recibo: receiptCode,
      });
    } catch (err) {
      console.warn('Erro ao persistir presença biométrica no Firestore:', err);
    }

    const newLog: AccessLog = {
      id: `log-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      studentPhoto: student.photoUrl,
      className: student.className,
      schoolName: student.schoolName,
      type,
      timestamp: timeStr,
      date: dateStr,
      location,
      method,
      receiptCode,
      notified: true,
      notifiedRecipient: `${student.parentName} (${student.parentPhone})`,
      statusNote: `${student.parentName.split(' ')[0]} Notificado via Push`,
    };

    // Update in-memory fallback
    setLogs((prev) => [newLog, ...prev]);

    // Update student presence status
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === student.id) {
          return {
            ...s,
            status: type === 'entry' ? 'present' : 'present',
            lastEntryTime: type === 'entry' ? timeStr : s.lastEntryTime,
            lastExitTime: type === 'exit' ? timeStr : s.lastExitTime,
          };
        }
        return s;
      })
    );

    // Update class stats
    setClassStats((prev) =>
      prev.map((cls) => {
        if (cls.classId === student.classId) {
          const currentPresents = type === 'entry' ? Math.min(cls.totalStudents, cls.presentsToday + 1) : cls.presentsToday;
          return {
            ...cls,
            presentsToday: currentPresents,
            absentsToday: Math.max(0, cls.totalStudents - currentPresents),
          };
        }
        return cls;
      })
    );

    // Push notification for parent
    const newNotif: SchoolNotification = {
      id: `notif-${Date.now()}`,
      type: type === 'entry' ? 'access_entry' : 'access_exit',
      title: type === 'entry' ? 'Entrada confirmada!' : 'Saída registrada',
      message: `${student.name} ${type === 'entry' ? 'entrou no' : 'saiu do'} ${student.schoolName} às ${timeStr.slice(0, 5)} via ${method === 'facial' ? 'Reconhecimento Facial' : method === 'fingerprint' ? 'Biometria Digital' : 'Validação Manual'}.`,
      studentId: student.id,
      studentName: student.name,
      className: student.className,
      senderName: 'Terminal Biométrico Portaria',
      senderRole: 'Sistema Alô mãe',
      date: 'Hoje',
      time: timeStr.slice(0, 5),
      isRead: false,
      receiptCode,
    };

    setNotifications((prev) => [newNotif, ...prev]);

    // Sounds
    audioManager.playSuccessChime();
    audioManager.speakConfirmation(student.name, type);

    setToastMessage({
      title: `${type === 'entry' ? 'Entrada' : 'Saída'} Confirmada — Alô mãe`,
      desc: `${student.name} • ${timeStr} • Notificação sincronizada no Firestore`,
      type: 'success',
    });

    return newLog;
  };

  const sendTeacherNotification = (
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
      senderName: currentUser?.name || 'Profª. Maria Fernandes',
      senderRole: 'Professora Titular',
      date: 'Hoje',
      time: timeStr,
      isRead: false,
      reunionDate,
      reunionTime,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    audioManager.playNotificationPing();

    setToastMessage({
      title: 'Notificação Push Enviada aos Pais!',
      desc: target === 'all' ? 'Enviado para todos os encarregados da turma 10ª Classe A' : `Enviado para os encarregados de ${targetStudent?.name}`,
      type: 'info',
    });
  };

  const updateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return { ...s, status };
        }
        return s;
      })
    );

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
          senderName: currentUser?.name || 'Profª. Maria Fernandes',
          senderRole: 'Controlo de Presenças',
          date: 'Hoje',
          time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
        };
        setNotifications((prev) => [notif, ...prev]);
        setToastMessage({
          title: 'Alerta de Falta Notificado!',
          desc: `Encarregado de ${student.name} alertado em tempo real.`,
          type: 'alert',
        });
      }
    }
  };

  const updateGuiaMedica = async (alunoId: string, guia: GuiaMedica) => {
    await firestoreUpdateGuiaMedica(alunoId, guia);
    setAlunos((prev) =>
      prev.map((a) => (a.id === alunoId ? { ...a, guia_medica: guia } : a))
    );
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

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
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
        alunos,
        turmas,
        turmasProfessores,
        miniPautas,
        presencasBiometricas,
        students,
        logs,
        notifications,
        clinics,
        classStats,
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
