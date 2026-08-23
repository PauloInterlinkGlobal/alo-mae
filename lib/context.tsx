'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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

interface SystemContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  login: (role: UserRole, emailOrPhone?: string) => Promise<boolean>;
  logout: () => void;
  isTerminalAuthorized: boolean;
  setTerminalAuthorized: (val: boolean) => void;
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
  registerBiometricAccess: (
    studentId: string,
    type: 'entry' | 'exit',
    method: 'facial' | 'fingerprint' | 'manual',
    location?: string
  ) => AccessLog;
  sendTeacherNotification: (
    type: NotificationType,
    target: 'all' | string,
    subject: string,
    message: string,
    reunionDate?: string,
    reunionTime?: string
  ) => void;
  updateStudentStatus: (studentId: string, status: AttendanceStatus) => void;
  markNotificationAsRead: (id: string) => void;
  unreadCount: number;
  toastMessage: { title: string; desc: string; type: 'success' | 'info' | 'alert' } | null;
  dismissToast: () => void;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default session initializes with 'pai' to avoid flash, but can be switched at /login
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

  // Sync to local storage
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

  const login = async (role: UserRole, emailOrPhone?: string): Promise<boolean> => {
    const user = MOCK_USERS[role];
    if (user) {
      const updatedUser = {
        ...user,
        email: emailOrPhone && emailOrPhone.includes('@') ? emailOrPhone : user.email,
        phone: emailOrPhone && !emailOrPhone.includes('@') ? emailOrPhone : user.phone,
      };
      setCurrentUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('alomae_user', JSON.stringify(updatedUser));
      }
      setToastMessage({
        title: `Sessão iniciada como ${user.role.toUpperCase()}`,
        desc: `Bem-vindo(a), ${user.name}!`,
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

  const registerBiometricAccess = (
    studentId: string,
    type: 'entry' | 'exit',
    method: 'facial' | 'fingerprint' | 'manual',
    location = 'Guarita Principal — Portaria 1'
  ): AccessLog => {
    const student = students.find((s) => s.id === studentId) || students[0];
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const dateStr = now.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
    const receiptCode = `CF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${timeStr.replace(/:/g, '')}-${student.id.toUpperCase()}`;

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

    // 1. Update logs feed
    setLogs((prev) => [newLog, ...prev]);

    // 2. Update Student status
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

    // 3. Update class stats
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

    // 4. Create push notification for parent app
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

    // Play sounds & Voice
    audioManager.playSuccessChime();
    audioManager.speakConfirmation(student.name, type);

    // Trigger visual toast
    setToastMessage({
      title: `${type === 'entry' ? 'Entrada' : 'Saída'} Confirmada — Alô mãe`,
      desc: `${student.name} • ${timeStr} • Notificação enviada para ${student.parentName}`,
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
      className: '1º Ano A',
      senderName: 'Profª. Maria Fernandes',
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
      desc: target === 'all' ? 'Enviado para todos os encarregados da turma 1º Ano A' : `Enviado para os encarregados de ${targetStudent?.name}`,
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
          senderName: 'Profª. Maria Fernandes',
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
        markNotificationAsRead,
        unreadCount,
        toastMessage,
        dismissToast,
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
