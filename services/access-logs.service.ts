import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AccessLog, AttendanceEventType } from '@/lib/types';
import { registerAttendanceBiometricEvent } from './attendance-engine.service';

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
  type: 'entry' | 'exit' | AttendanceEventType,
  method: 'facial' | 'fingerprint' | 'manual' = 'facial',
  location = 'Portão Principal - Bloco A',
  recordedByUid?: string
): Promise<AccessLog> {
  const eventType: AttendanceEventType =
    type === 'entry'
      ? 'ENTRADA'
      : type === 'exit'
      ? 'SAIDA_OFICIAL'
      : (type as AttendanceEventType);

  const mappedMethod =
    method === 'facial' ? 'FACIAL' : method === 'fingerprint' ? 'FINGERPRINT' : 'MANUAL';

  const result = await registerAttendanceBiometricEvent({
    studentId,
    eventType,
    method: mappedMethod,
    location,
    recordedByUid,
  });

  // Caminho legado: tentativas negadas não geram AccessLog — sinalizar ao chamador.
  if (!result.log) {
    throw new Error(`Acesso não autorizado (${result.event.reasonCode || 'ACESSO_REJEITADO'}). Nenhum registo de acesso criado.`);
  }
  return result.log;
}
