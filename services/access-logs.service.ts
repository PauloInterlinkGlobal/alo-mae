import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AccessLog, Student, SchoolNotification, AttendanceStatus } from '@/lib/types';

export function listenAccessLogs(
  institutionId?: string,
  studentId?: string,
  maxResults = 50,
  callback?: (logs: AccessLog[]) => void
) {
  let q = query(collection(db, 'accessLogs'), orderBy('createdAt', 'desc'), limit(maxResults));
  if (studentId) {
    q = query(collection(db, 'accessLogs'), where('studentId', '==', studentId), limit(maxResults));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AccessLog[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AccessLog);
      });
      if (callback) callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar registros de acesso:', err);
    }
  );
}

export async function registerBiometricAccess(
  studentId: string,
  type: 'entry' | 'exit',
  method: 'facial' | 'fingerprint' | 'manual' = 'facial',
  location = 'Portão Principal - Bloco A',
  recordedByUid?: string
): Promise<AccessLog> {
  const studentDocRef = doc(db, 'students', studentId);
  const studentSnap = await getDoc(studentDocRef);

  if (!studentSnap.exists()) {
    throw new Error(`Estudante com ID ${studentId} não encontrado.`);
  }

  const student = studentSnap.data() as Student;
  const studentName = student.fullName || student.name || 'Aluno';
  const className = student.className || '10ª Classe A';
  const institutionId = student.institutionId || student.schoolId || 'school_horizonte_luanda';

  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('pt-PT');
  const dateKey = now.toISOString().split('T')[0];

  const receiptCode = `REC-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const batch = writeBatch(db);

  // 1. Create AccessLog document
  const logRef = doc(collection(db, 'accessLogs'));
  const logData: AccessLog = {
    id: logRef.id,
    institutionId,
    schoolId: institutionId,
    studentId,
    studentName,
    studentPhoto: student.photoUrl || student.foto_biometrica_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop',
    classId: student.currentClassId || student.classId || 'turma_10a',
    className,
    type,
    method,
    location,
    receiptCode,
    timestamp: timeStr,
    date: dateStr,
    recordedByUid: recordedByUid || 'system_biometric_terminal',
    deviceId: 'terminal_facial_01',
    notified: true,
    notificationStatus: 'sent',
    notifiedRecipient: student.parentPhone || student.parentEmail || 'Encarregado',
    statusNote: type === 'entry' ? 'Entrada confirmada no recinto escolar' : 'Saída registada com sucesso',
    createdAt: serverTimestamp(),
  };
  batch.set(logRef, logData);

  // 2. Update Student status & timestamps
  const newStatus: AttendanceStatus = type === 'entry' ? 'present' : 'absent';
  const studentUpdates: Partial<Student> = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };
  if (type === 'entry') {
    studentUpdates.lastEntryTime = timeStr;
  } else {
    studentUpdates.lastExitTime = timeStr;
  }
  batch.update(studentDocRef, studentUpdates);

  // 3. Create/Update Attendance Record for Today
  const attendanceId = `${institutionId}_${student.currentClassId || student.classId}_${studentId}_${dateKey}`;
  const attendanceRef = doc(db, 'attendanceRecords', attendanceId);
  batch.set(
    attendanceRef,
    {
      id: attendanceId,
      institutionId,
      classId: student.currentClassId || student.classId || 'turma_10a',
      studentId,
      studentName,
      dateKey,
      status: newStatus,
      recordedByUid: recordedByUid || 'system_biometric_terminal',
      source: 'biometric',
      timestamp: timeStr,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  // 4. Create Parent Notification
  const notifRef = doc(collection(db, 'notifications'));
  const notifData: SchoolNotification = {
    id: notifRef.id,
    institutionId,
    schoolId: institutionId,
    type: type === 'entry' ? 'access_entry' : 'access_exit',
    title: type === 'entry' ? `Entrada Registada: ${studentName}` : `Saída Registada: ${studentName}`,
    subject: `Controlo Biométrico: ${studentName}`,
    message: `${studentName} registou ${type === 'entry' ? 'entrada' : 'saída'} na escola (${location}) às ${timeStr}. Comprovativo autenticado: ${receiptCode}.`,
    senderName: 'Terminal Biométrico Portaria',
    senderRole: 'portaria',
    studentId,
    studentName,
    className,
    date: dateStr,
    time: timeStr,
    receiptCode,
    isRead: false,
    createdAt: serverTimestamp(),
  };
  batch.set(notifRef, notifData);

  // Commit atomic batch
  await batch.commit();

  return logData;
}
