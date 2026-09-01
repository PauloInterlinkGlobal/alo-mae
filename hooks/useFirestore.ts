'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Student,
  Grade,
  AccessLog,
  StudentMedical,
  SchoolNotification,
  ClassAttendanceStat,
} from '@/lib/types';

/**
 * Hook para escutar a coleção de alunos (students) em tempo real
 */
export function useStudents(schoolId?: string, classId?: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'students'));
    if (schoolId) {
      q = query(q, where('schoolId', '==', schoolId));
    }
    if (classId) {
      q = query(q, where('classId', '==', classId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Student[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Student);
        });
        setStudents(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no hook useStudents:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [schoolId, classId]);

  return { students, loading, error };
}

/**
 * Hook para escutar as notas e mini pautas (grades) em tempo real
 */
export function useGrades(filters?: { studentId?: string; classId?: string; teacherId?: string; status?: string }) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'grades'));
    if (filters?.studentId) {
      q = query(q, where('studentId', '==', filters.studentId));
    }
    if (filters?.classId) {
      q = query(q, where('classId', '==', filters.classId));
    }
    if (filters?.teacherId) {
      q = query(q, where('teacherId', '==', filters.teacherId));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Grade[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Grade);
        });
        setGrades(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no hook useGrades:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filters?.studentId, filters?.classId, filters?.teacherId, filters?.status]);

  const createGrade = async (gradeData: Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRef = doc(collection(db, 'grades'));
    await setDoc(newRef, {
      ...gradeData,
      id: newRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newRef.id;
  };

  const updateGradeStatus = async (gradeId: string, status: 'approved' | 'rejected', approvedBy?: string) => {
    const ref = doc(db, 'grades', gradeId);
    await updateDoc(ref, {
      status,
      approvedBy: approvedBy || null,
      updatedAt: serverTimestamp(),
    });
  };

  return { grades, loading, error, createGrade, updateGradeStatus };
}

/**
 * Hook para escutar o histórico de acessos biométricos (accessLogs)
 */
export function useAccessLogs(filters?: { studentId?: string; schoolId?: string; maxResults?: number }) {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'accessLogs'), orderBy('timestamp', 'desc'));
    if (filters?.studentId) {
      q = query(collection(db, 'accessLogs'), where('studentId', '==', filters.studentId));
    }
    if (filters?.maxResults) {
      q = query(q, limit(filters.maxResults));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AccessLog[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AccessLog);
        });
        setLogs(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no hook useAccessLogs:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filters?.studentId, filters?.schoolId, filters?.maxResults]);

  return { logs, loading, error };
}

/**
 * Hook para consultar e atualizar a Guia Médica do aluno (studentMedical)
 */
export function useStudentMedical(studentId: string | null) {
  const [medical, setMedical] = useState<StudentMedical | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!studentId) {
      return;
    }

    const docRef = doc(db, 'studentMedical', studentId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setMedical(docSnap.data() as StudentMedical);
        } else {
          setMedical(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Erro no hook useStudentMedical:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [studentId]);

  const updateMedical = async (data: Partial<StudentMedical>) => {
    if (!studentId) return;
    const docRef = doc(db, 'studentMedical', studentId);
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  };

  return { medical, loading, error, updateMedical };
}

/**
 * Hook para escutar notificações em tempo real (notifications)
 */
export function useNotifications(targetUid?: string, studentId?: string) {
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('date', 'desc'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: SchoolNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as SchoolNotification);
        });
        setNotifications(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no hook useNotifications:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetUid, studentId]);

  const markAsRead = async (notificationId: string) => {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { isRead: true, updatedAt: serverTimestamp() });
  };

  return { notifications, loading, error, markAsRead };
}

/**
 * Hook para escutar estatísticas das turmas (classStats)
 */
export function useClassStats(schoolId?: string) {
  const [classStats, setClassStats] = useState<ClassAttendanceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'classStats'));
    if (schoolId) {
      q = query(q, where('schoolId', '==', schoolId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ClassAttendanceStat[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ classId: docSnap.id, ...docSnap.data() } as ClassAttendanceStat);
        });
        setClassStats(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no hook useClassStats:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [schoolId]);

  return { classStats, loading, error };
}
