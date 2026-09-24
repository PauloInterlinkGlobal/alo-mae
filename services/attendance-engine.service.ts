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
import {
  AttendanceEventRecord,
  DailyAttendanceRecord,
  AttendanceEventType,
  AttendanceState,
  AttendanceSchedule,
  AccessLog,
  Student,
  SchoolNotification,
} from '@/lib/types';

/**
 * Cronograma padrão (fallback seguro) — instituições configuram via
 * schoolSettings/attendanceSchedule; o terminal propaga em TerminalConfig.
 */
export const DEFAULT_ATTENDANCE_SCHEDULE: AttendanceSchedule = {
  morning: {
    entryStart: '07:00',
    entryEnd: '09:00',
    officialExitStart: '12:00',
    officialExitEnd: '13:00',
  },
  afternoon: {
    entryStart: '12:00',
    entryEnd: '14:00',
    officialExitStart: '17:00',
    officialExitEnd: '18:00',
  },
};

function minutesFromHHMM(hhmm: string, fallbackMinutes: number): number {
  const parts = hhmm?.split(':');
  if (!parts || parts.length !== 2) return fallbackMinutes;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallbackMinutes;
  return h * 60 + m;
}

/**
 * Determines the next appropriate attendance event according to the state machine.
 *
 * State Machine Graph:
 * - AUSENTE -> ENTRADA -> PRESENTE
 * - PRESENTE -> SAIDA_TEMPORARIA -> FORA_TEMPORARIAMENTE
 * - FORA_TEMPORARIAMENTE -> RETORNO -> PRESENTE
 * - PRESENTE (or FORA_TEMPORARIAMENTE) -> SAIDA_OFICIAL -> SAIU_OFICIALMENTE
 * - SAIU_OFICIALMENTE -> ACESSO_REJEITADO (reentryPolicy 'block', default)
 *                       | ENTRADA (reentryPolicy 'allow', ex.: estudo vespertino)
 */
export function evaluateNextAttendanceEvent(
  currentState: AttendanceState = 'AUSENTE',
  modePreference: 'auto' | AttendanceEventType = 'auto',
  schedule: AttendanceSchedule = DEFAULT_ATTENDANCE_SCHEDULE,
  reentryPolicy: 'block' | 'allow' = 'block'
): AttendanceEventType {
  if (modePreference !== 'auto') {
    return modePreference;
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dismissalStart = minutesFromHHMM(schedule.morning.officialExitStart, 12 * 60 + 30);

  const isAfternoonOrDismissal = nowMinutes >= dismissalStart;

  switch (currentState) {
    case 'AUSENTE':
      return 'ENTRADA';

    case 'FORA_TEMPORARIAMENTE':
      return 'RETORNO';

    case 'PRESENTE':
      // If past regular dismissal time, default to official exit; otherwise temporary pass
      return isAfternoonOrDismissal ? 'SAIDA_OFICIAL' : 'SAIDA_TEMPORARIA';

    case 'SAIU_OFICIALMENTE':
      // REGRA (auditoria §5): após a saída oficial a entrada é bloqueada por defeito
      // e a tentativa é registada (ACESSO_REJEITADO). 'allow' fica para modos
      // especiais configurados pela instituição (ex.: estudo vespertino).
      return reentryPolicy === 'allow' ? 'ENTRADA' : 'ACESSO_REJEITADO';

    default:
      return 'ENTRADA';
  }
}

/**
 * Maps the executed event to the resulting attendance state.
 * ACESSO_REJEITADO nunca altera o estado — devolve o estado atual.
 */
export function getNewAttendanceState(
  eventType: AttendanceEventType,
  currentState: AttendanceState = 'AUSENTE'
): AttendanceState {
  switch (eventType) {
    case 'ENTRADA':
    case 'RETORNO':
      return 'PRESENTE';
    case 'SAIDA_TEMPORARIA':
      return 'FORA_TEMPORARIAMENTE';
    case 'SAIDA_OFICIAL':
      return 'SAIU_OFICIALMENTE';
    case 'ACESSO_REJEITADO':
      return currentState;
  }
}

/**
 * Human-readable description of the event in Portuguese
 */
export function getAttendanceEventLabel(type: AttendanceEventType): string {
  switch (type) {
    case 'ENTRADA':
      return 'Entrada Confirmada';
    case 'SAIDA_TEMPORARIA':
      return 'Saída Temporária Autorizada';
    case 'RETORNO':
      return 'Retorno à Sala de Aula';
    case 'SAIDA_OFICIAL':
      return 'Saída Oficial Registada';
    case 'ACESSO_REJEITADO':
      return 'Entrada Não Autorizada';
  }
}

/**
 * Registers a denied access attempt (e.g. re-entry after official exit).
 * Writes attendanceEvents (type ACESSO_REJEITADO) + auditLogs only —
 * NO state change, NO parent notification, NO dailyAttendance mutation.
 */
export async function registerDeniedAttendanceAttempt(
  params: RegisterAttendanceParams
): Promise<AttendanceEventRecord> {
  const {
    studentId,
    method = 'FACIAL',
    location = 'Portão Principal - Terminal #01',
    deviceId = 'terminal-01',
    confidence = 0.96,
    livenessPassed = true,
    reasonCode = 'REENTRY_AFTER_OFFICIAL_EXIT',
  } = params;

  const studentRef = doc(db, 'students', studentId);
  const studentSnap = await getDoc(studentRef);
  if (!studentSnap.exists()) {
    throw new Error(`Estudante [${studentId}] não encontrado na base de dados.`);
  }

  const student = studentSnap.data() as Student;
  const studentName = student.fullName || student.name || 'Aluno';
  const className = student.className || '';
  const classId = student.currentClassId || student.classId || '';
  const schoolId = student.schoolId || student.institutionId || '';
  const institutionId = student.institutionId || schoolId;
  const photoUrl = student.photoUrl || student.foto_biometrica_url || '';

  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('pt-PT');
  const dateKey = now.toISOString().split('T')[0];

  const deniedRef = doc(collection(db, 'attendanceEvents'));
  const deniedRecord: AttendanceEventRecord = {
    id: deniedRef.id,
    studentId,
    studentName,
    matricula: student.matricula,
    studentPhoto: photoUrl,
    schoolId,
    institutionId,
    classId,
    className,
    deviceId,
    location,
    date: dateStr,
    dateKey,
    timestamp: timeStr,
    type: 'ACESSO_REJEITADO',
    method,
    confidence,
    livenessPassed,
    reasonCode,
    receiptCode: `REC-DENIED-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
    synced: true,
    createdAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(deniedRef, deniedRecord);
  batch.set(doc(collection(db, 'auditLogs')), {
    institutionId: schoolId || 'sem_escola',
    actorUid: 'terminal_system',
    actorName: `Terminal (${deviceId})`,
    actorRole: 'terminal',
    action: 'access_denied',
    entityType: 'attendanceEvents',
    entityId: deniedRef.id,
    description: `Tentativa de acesso negada para ${studentName} — motivo: ${reasonCode}`,
    timestamp: serverTimestamp(),
  });
  await batch.commit();

  return deniedRecord;
}

export interface RegisterAttendanceParams {
  studentId: string;
  eventType?: AttendanceEventType;
  preferredMode?: 'auto' | AttendanceEventType;
  method?: 'FACIAL' | 'FINGERPRINT' | 'MANUAL';
  location?: string;
  deviceId?: string;
  confidence?: number;
  livenessPassed?: boolean;
  authorizationId?: string;
  /** Motivo estruturado quando eventType = 'ACESSO_REJEITADO' */
  reasonCode?: string;
  recordedByUid?: string;
}

/**
 * Unified atomic domain registrar for all school biometric attendance events.
 * Updates attendanceEvents, dailyAttendance, students, accessLogs, attendanceRecords, and notifications.
 */
export async function registerAttendanceBiometricEvent(
  params: RegisterAttendanceParams
): Promise<{
  event: AttendanceEventRecord;
  daily: DailyAttendanceRecord;
  log: AccessLog | null;
}> {
  const {
    studentId,
    method = 'FACIAL',
    location = 'Portão Principal - Terminal #01',
    deviceId = 'terminal-01',
    confidence = 0.96,
    livenessPassed = true,
    authorizationId,
    recordedByUid = 'kiosk_system',
  } = params;

  // 1. Fetch Student from Firestore
  const studentRef = doc(db, 'students', studentId);
  const studentSnap = await getDoc(studentRef);

  if (!studentSnap.exists()) {
    throw new Error(`Estudante [${studentId}] não encontrado na base de dados.`);
  }

  const student = studentSnap.data() as Student;
  const studentName = student.fullName || student.name || 'Aluno';
  const className = student.className || '10ª Classe A';
  const classId = student.currentClassId || student.classId || 'turma_10a';
  const schoolId = student.schoolId || student.institutionId || 'school_horizonte_luanda';
  const institutionId = student.institutionId || schoolId;
  const photoUrl = student.photoUrl || student.foto_biometrica_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop';

  // 2. Fetch or create DailyAttendance record for today
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('pt-PT');
  const dateKey = now.toISOString().split('T')[0];
  const dailyDocId = `${studentId}_${dateKey}`;
  const dailyRef = doc(db, 'dailyAttendance', dailyDocId);
  const dailySnap = await getDoc(dailyRef);

  let dailyData: DailyAttendanceRecord;
  if (dailySnap.exists()) {
    dailyData = dailySnap.data() as DailyAttendanceRecord;
  } else {
    dailyData = {
      id: dailyDocId,
      studentId,
      studentName,
      matricula: student.matricula,
      classId,
      className,
      schoolId,
      institutionId,
      date: dateStr,
      dateKey,
      currentState: 'AUSENTE',
      temporaryExits: [],
      returns: [],
      totalEvents: 0,
      lastEventAt: timeStr,
      createdAt: serverTimestamp(),
    };
  }

  // 3. Resolve Effective Event Type
  const effectiveEventType = params.eventType
    ? params.eventType
    : evaluateNextAttendanceEvent(dailyData.currentState, params.preferredMode || 'auto');

  // 3.a Tentativa negada (ex.: nova entrada após saída oficial):
  //     regista o evento de auditoria SEM alterar estado, SEM notificar o
  //     encarregado e SEM escrever dailyAttendance/accessLogs.
  if (effectiveEventType === 'ACESSO_REJEITADO') {
    const deniedRecord = await registerDeniedAttendanceAttempt({
      ...params,
      eventType: 'ACESSO_REJEITADO',
      reasonCode: params.reasonCode || 'REENTRY_AFTER_OFFICIAL_EXIT',
    });
    return { event: deniedRecord, daily: dailyData, log: null };
  }

  const newCurrentState = getNewAttendanceState(effectiveEventType, dailyData.currentState);

  // 4. Update Daily Attendance Aggregation
  const updatedDaily: DailyAttendanceRecord = {
    ...dailyData,
    currentState: newCurrentState,
    totalEvents: (dailyData.totalEvents || 0) + 1,
    lastEventAt: timeStr,
    lastEventType: effectiveEventType,
    updatedAt: serverTimestamp(),
  };

  if (effectiveEventType === 'ENTRADA') {
    if (!updatedDaily.firstEntryAt) {
      updatedDaily.firstEntryAt = timeStr;
    }
  } else if (effectiveEventType === 'SAIDA_TEMPORARIA') {
    updatedDaily.temporaryExits = [
      ...(updatedDaily.temporaryExits || []),
      { at: timeStr, reason: authorizationId ? `Autorização #${authorizationId}` : 'Saída Intervalo/Pátio' },
    ];
  } else if (effectiveEventType === 'RETORNO') {
    updatedDaily.returns = [
      ...(updatedDaily.returns || []),
      { at: timeStr },
    ];
  } else if (effectiveEventType === 'SAIDA_OFICIAL') {
    updatedDaily.officialExitAt = timeStr;
  }

  // Generate Receipt Code
  const receiptCode = `REC-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 5. Prepare Event Document (attendanceEvents)
  const eventRef = doc(collection(db, 'attendanceEvents'));
  const eventRecord: AttendanceEventRecord = {
    id: eventRef.id,
    studentId,
    studentName,
    matricula: student.matricula,
    studentPhoto: photoUrl,
    schoolId,
    institutionId,
    classId,
    className,
    deviceId,
    location,
    date: dateStr,
    dateKey,
    timestamp: timeStr,
    type: effectiveEventType,
    method,
    confidence,
    livenessPassed,
    authorizationId,
    receiptCode,
    synced: true,
    createdAt: serverTimestamp(),
  };

  // 6. Backward Compatibility: AccessLog
  const logRef = doc(collection(db, 'accessLogs'));
  const legacyType: 'entry' | 'exit' =
    effectiveEventType === 'ENTRADA' || effectiveEventType === 'RETORNO' ? 'entry' : 'exit';

  const logData: AccessLog = {
    id: logRef.id,
    institutionId,
    schoolId,
    studentId,
    studentName,
    studentPhoto: photoUrl,
    classId,
    className,
    type: legacyType,
    eventType: effectiveEventType,
    method: method === 'FACIAL' ? 'facial' : method === 'FINGERPRINT' ? 'fingerprint' : 'manual',
    location,
    receiptCode,
    timestamp: timeStr,
    date: dateStr,
    recordedByUid,
    deviceId,
    similarityScore: confidence,
    notified: true,
    notificationStatus: 'sent',
    notifiedRecipient: student.parentPhone || student.parentEmail || 'Encarregado',
    statusNote: `${getAttendanceEventLabel(effectiveEventType)} • Alô Mãe Totem`,
    createdAt: serverTimestamp(),
  };

  // 7. Backward Compatibility: attendanceRecords
  const attendanceId = `${institutionId}_${classId}_${studentId}_${dateKey}`;
  const attendanceRef = doc(db, 'attendanceRecords', attendanceId);

  // 8. Parent Push Notification
  const notifRef = doc(collection(db, 'notifications'));
  const notifTitle =
    effectiveEventType === 'ENTRADA'
      ? `Entrada Confirmada: ${studentName}`
      : effectiveEventType === 'SAIDA_TEMPORARIA'
      ? `Saída Temporária: ${studentName}`
      : effectiveEventType === 'RETORNO'
      ? `Retorno à Sala: ${studentName}`
      : `Saída Oficial: ${studentName}`;

  const notifMessage =
    effectiveEventType === 'ENTRADA'
      ? `${studentName} deu entrada no colégio (${location}) às ${timeStr}. Comprovativo autenticado: ${receiptCode}.`
      : effectiveEventType === 'SAIDA_TEMPORARIA'
      ? `${studentName} registou saída temporária do recinto escolar às ${timeStr}.`
      : effectiveEventType === 'RETORNO'
      ? `${studentName} retornou ao recinto escolar e encontra-se na sala de aula às ${timeStr}.`
      : `${studentName} encerrou as atividades letivas e registou saída oficial às ${timeStr}.`;

  const notifData: SchoolNotification = {
    id: notifRef.id,
    institutionId,
    schoolId,
    type: legacyType === 'entry' ? 'access_entry' : 'access_exit',
    title: notifTitle,
    subject: `Alô Mãe Biometria: ${studentName}`,
    message: notifMessage,
    senderName: `Terminal Biométrico (${deviceId})`,
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

  // 9. Atomic Batch Commit
  const batch = writeBatch(db);
  batch.set(eventRef, eventRecord);
  batch.set(dailyRef, updatedDaily, { merge: true });
  batch.set(logRef, logData);
  batch.set(notifRef, notifData);

  // Update student status
  const studentUpdates: Partial<Student> = {
    status: newCurrentState === 'PRESENTE' ? 'present' : 'absent',
    updatedAt: serverTimestamp(),
  };
  if (effectiveEventType === 'ENTRADA') {
    studentUpdates.lastEntryTime = timeStr;
  } else if (effectiveEventType === 'SAIDA_OFICIAL') {
    studentUpdates.lastExitTime = timeStr;
  }
  batch.update(studentRef, studentUpdates);

  // Update attendanceRecords
  batch.set(
    attendanceRef,
    {
      id: attendanceId,
      institutionId,
      classId,
      studentId,
      studentName,
      dateKey,
      status: newCurrentState === 'PRESENTE' ? 'present' : 'absent',
      recordedByUid,
      source: 'biometric',
      timestamp: timeStr,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  return {
    event: eventRecord,
    daily: updatedDaily,
    log: logData,
  };
}

/**
 * Real-time subscription to today's biometric events
 */
export function listenAttendanceEvents(
  dateKey?: string,
  maxResults = 25,
  callback?: (events: AttendanceEventRecord[]) => void
) {
  const targetDateKey = dateKey || new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, 'attendanceEvents'),
    where('dateKey', '==', targetDateKey),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AttendanceEventRecord[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as AttendanceEventRecord);
      });
      if (callback) callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar attendanceEvents:', err);
    }
  );
}

/**
 * Real-time subscription to daily attendance summaries
 */
export function listenDailyAttendance(
  dateKey?: string,
  callback?: (records: DailyAttendanceRecord[]) => void
) {
  const targetDateKey = dateKey || new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'dailyAttendance'), where('dateKey', '==', targetDateKey));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: DailyAttendanceRecord[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as DailyAttendanceRecord);
      });
      if (callback) callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar dailyAttendance:', err);
    }
  );
}
