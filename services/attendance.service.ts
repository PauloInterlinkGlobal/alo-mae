import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AttendanceRecord, AttendanceStatus, ClassAttendanceStat } from '@/lib/types';

export async function markAttendance(
  institutionId: string,
  classId: string,
  studentId: string,
  status: AttendanceStatus,
  recordedByUid: string,
  source: 'teacher' | 'biometric' | 'institution' = 'teacher',
  note?: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const recordId = `${institutionId}_${classId}_${studentId}_${today}`;
  const recordRef = doc(db, 'attendanceRecords', recordId);

  await setDoc(
    recordRef,
    {
      id: recordId,
      institutionId,
      classId,
      studentId,
      dateKey: today,
      status,
      recordedByUid,
      source,
      note: note || null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Also sync with student document
  const studentRef = doc(db, 'students', studentId);
  await updateDoc(studentRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function getAttendanceByClassAndDate(
  classId: string,
  dateKey: string
): Promise<AttendanceRecord[]> {
  try {
    const q = query(
      collection(db, 'attendanceRecords'),
      where('classId', '==', classId),
      where('dateKey', '==', dateKey)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AttendanceRecord);
  } catch (error) {
    console.error('Erro ao buscar presenças da turma:', error);
    return [];
  }
}

export async function getStudentAttendanceHistory(
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<AttendanceRecord[]> {
  try {
    let q = query(collection(db, 'attendanceRecords'), where('studentId', '==', studentId));
    if (startDate) {
      q = query(q, where('dateKey', '>=', startDate));
    }
    if (endDate) {
      q = query(q, where('dateKey', '<=', endDate));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AttendanceRecord);
  } catch (error) {
    console.error('Erro ao buscar histórico de presença do aluno:', error);
    return [];
  }
}
