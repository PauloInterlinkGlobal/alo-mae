import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { AccessLogDoc, StudentDoc } from './types';

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Trigger: onAccessLogCreated
 * FIX #3: Propaga classId para logs e notificações de forma estável
 */
export const onAccessLogCreated = onDocumentCreated('accessLogs/{logId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const log = snap.data() as AccessLogDoc;
  const { studentId, schoolId, classId, type, timestamp, method, location, receiptCode, studentName } = log;

  if (!studentId) return;

  const studentRef = db.collection('students').doc(studentId);
  const studentSnap = await studentRef.get();

  if (!studentSnap.exists) {
    console.warn(`Aluno ${studentId} não encontrado no processamento de log ${event.params.logId}`);
    return;
  }

  const studentData = studentSnap.data() as StudentDoc;
  const effectiveClassId = classId || studentData.classId;

  // 1. Atualizar status e timestamps do aluno
  const newStatus = type === 'entry' ? 'present' : studentData.status;
  const updateData: Partial<StudentDoc> = {
    status: newStatus,
    ...(type === 'entry' ? { lastEntryTime: timestamp } : { lastExitTime: timestamp })
  };

  await studentRef.set(updateData, { merge: true });

  // 2. Criar Notificação para o Encarregado com classId estável
  const notificationId = `notif_${event.params.logId}`;
  const actionLabel = type === 'entry' ? 'Entrada confirmada na escola' : 'Saída registada da escola';
  const methodLabel = method === 'facial' ? 'Reconhecimento Facial' : method === 'fingerprint' ? 'Biometria Digital' : 'Registo Manual';

  const notificationData = {
    id: notificationId,
    type: type === 'entry' ? 'access_entry' : 'access_exit',
    title: `${actionLabel} — ${studentName || studentData.name}`,
    subject: `Controlo de Acesso Biométrico (${methodLabel})`,
    message: `O aluno ${studentName || studentData.name} registou ${type === 'entry' ? 'entrada' : 'saída'} às ${new Date(timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} no ponto "${location}". Comprovativo emitido com código ${receiptCode}.`,
    studentId: studentId,
    studentName: studentName || studentData.name,
    classId: effectiveClassId, // FIX #3
    className: studentData.className,
    schoolId: schoolId || studentData.schoolId,
    senderName: 'Terminal Biométrico Integrado',
    senderRole: 'sistema',
    date: new Date(timestamp).toISOString().split('T')[0],
    time: new Date(timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    isRead: false,
    receiptCode: receiptCode,
    targetScope: 'student'
  };

  await db.collection('notifications').doc(notificationId).set(notificationData);

  // 3. Enviar notificação Push (FCM) ao encarregado
  try {
    const parentQuery = await db.collection('users')
      .where('role', '==', 'pai')
      .where('childrenIds', 'array-contains', studentId)
      .get();

    for (const parentDoc of parentQuery.docs) {
      const parentData = parentDoc.data();
      const fcmTokens: string[] = parentData.fcmTokens || (parentData.fcmToken ? [parentData.fcmToken] : []);

      if (fcmTokens.length > 0) {
        await messaging.sendEachForMulticast({
          tokens: fcmTokens,
          notification: {
            title: `Alô Mãe: ${actionLabel}`,
            body: `${studentName || studentData.name} às ${notificationData.time} no ${location}.`
          },
          data: {
            notificationId,
            studentId,
            classId: effectiveClassId,
            receiptCode: receiptCode || '',
            type: notificationData.type
          }
        });
      }
    }
  } catch (error) {
    console.error('Erro ao enviar FCM push para o encarregado:', error);
  }
});

/**
 * Trigger: recalculateClassStats
 */
export const recalculateClassStats = onDocumentWritten('students/{studentId}', async (event) => {
  const afterData = event.data?.after.data() as StudentDoc | undefined;
  const beforeData = event.data?.before.data() as StudentDoc | undefined;

  const classId = afterData?.classId || beforeData?.classId;
  const schoolId = afterData?.schoolId || beforeData?.schoolId;

  if (!classId || !schoolId) return;

  if (afterData && beforeData && afterData.status === beforeData.status && afterData.classId === beforeData.classId) {
    return;
  }

  const studentsInClassQuery = await db.collection('students')
    .where('schoolId', '==', schoolId)
    .where('classId', '==', classId)
    .get();

  const totalStudents = studentsInClassQuery.size;
  if (totalStudents === 0) return;

  let presents = 0;
  let absents = 0;
  let lates = 0;
  let className = afterData?.className || beforeData?.className || 'Turma';

  studentsInClassQuery.docs.forEach((doc) => {
    const s = doc.data() as StudentDoc;
    if (s.status === 'present') presents++;
    else if (s.status === 'absent') absents++;
    else if (s.status === 'late') lates++;
    if (s.className) className = s.className;
  });

  const frequencyRate = totalStudents > 0 ? Number(((presents + lates) / totalStudents * 100).toFixed(1)) : 0;

  const statRef = db.collection('classStats').doc(classId);
  const existingStatSnap = await statRef.get();
  const existingStat = existingStatSnap.exists ? existingStatSnap.data() : {};

  await statRef.set({
    classId,
    className,
    schoolId,
    teacherName: existingStat?.teacherName || 'Docente Responsável',
    room: existingStat?.room || 'Sala Principal',
    totalStudents,
    presentsToday: presents,
    absentsToday: absents,
    latesToday: lates,
    monthlyPresents: (existingStat?.monthlyPresents || 0) + (presents > 0 ? 1 : 0),
    monthlyAbsences: existingStat?.monthlyAbsences || 0,
    monthlyLates: existingStat?.monthlyLates || 0,
    frequencyRate,
    updatedAt: new Date().toISOString()
  }, { merge: true });
});
