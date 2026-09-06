'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Student, GuardianStudentLink } from '@/lib/types';

export function useGuardianStudents(guardianUid?: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!guardianUid) {
      queueMicrotask(() => {
        setStudents([]);
        setLoading(false);
      });
      return;
    }

    // 1. Escutar links do encarregado
    const qLinks = query(
      collection(db, 'guardianStudentLinks'),
      where('guardianUid', '==', guardianUid),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(
      qLinks,
      async (linkSnapshot) => {
        try {
          const studentIds = linkSnapshot.docs.map((d) => (d.data() as GuardianStudentLink).studentId);

          if (studentIds.length === 0) {
            // Check fallback in user document
            const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', guardianUid)));
            if (!userSnap.empty && userSnap.docs[0].data().studentIds?.length > 0) {
              studentIds.push(...userSnap.docs[0].data().studentIds);
            }
          }

          if (studentIds.length === 0) {
            setStudents([]);
            setLoading(false);
            return;
          }

          // Fetch matching students
          const fetchedStudents: Student[] = [];
          for (const sId of studentIds) {
            const sSnap = await getDocs(query(collection(db, 'students'), where('id', '==', sId)));
            if (!sSnap.empty) {
              const data = sSnap.docs[0].data() as Student;
              fetchedStudents.push({
                ...data,
                id: sSnap.docs[0].id,
                name: data.fullName || data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
                nome_completo: data.fullName || data.name || '',
                classId: data.currentClassId || data.classId,
                turma_id: data.currentClassId || data.classId,
              });
            }
          }
          setStudents(fetchedStudents);
          setLoading(false);
        } catch (err: any) {
          console.error('Erro ao buscar educandos do encarregado:', err);
          setError(err);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Erro na query de links:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [guardianUid]);

  return { students, loading, error };
}
