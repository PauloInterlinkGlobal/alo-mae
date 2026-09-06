import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuditLog } from '@/lib/types';

export async function recordAuditLog(
  log: Omit<AuditLog, 'id' | 'timestamp'>
): Promise<string> {
  try {
    const newRef = doc(collection(db, 'auditLogs'));
    await setDoc(newRef, {
      ...log,
      id: newRef.id,
      timestamp: serverTimestamp(),
    });
    return newRef.id;
  } catch (err) {
    console.warn('Erro ao registar log de auditoria:', err);
    return '';
  }
}
