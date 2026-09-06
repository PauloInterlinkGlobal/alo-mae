'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MiniReport, TeacherAssignment } from '@/lib/types';
import {
  createMiniReport,
  saveMiniReportGrades,
  submitMiniReport,
  approveMiniReport,
  rejectMiniReport,
  publishMiniReport,
} from '@/services/mini-reports.service';

export function useMiniReports(filters?: { teacherUid?: string; institutionId?: string }) {
  const [reports, setReports] = useState<MiniReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'miniReports'), orderBy('createdAt', 'desc'));
    if (filters?.teacherUid) {
      q = query(collection(db, 'miniReports'), where('teacherUid', '==', filters.teacherUid));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MiniReport[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MiniReport;
          list.push({
            ...data,
            id: docSnap.id,
            disciplina: data.disciplina || data.subjectName || 'Disciplina',
            turma_nome: data.turma_nome || data.className || 'Turma',
            trimestre: data.trimestre || 1,
          });
        });
        setReports(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no hook useMiniReports:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filters?.teacherUid, filters?.institutionId]);

  return {
    reports,
    loading,
    error,
    createReport: createMiniReport,
    saveGrades: saveMiniReportGrades,
    submitReport: submitMiniReport,
    approveReport: approveMiniReport,
    rejectReport: rejectMiniReport,
    publishReport: publishMiniReport,
  };
}

export function useTeacherAssignments(teacherUid?: string) {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!teacherUid) {
      queueMicrotask(() => {
        setAssignments([]);
        setLoading(false);
      });
      return;
    }

    const q = query(
      collection(db, 'teacherAssignments'),
      where('teacherUid', '==', teacherUid),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TeacherAssignment[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as TeacherAssignment);
        });
        setAssignments(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no hook useTeacherAssignments:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [teacherUid]);

  return { assignments, loading, error };
}
