import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SchoolNotification, NotificationType } from '@/lib/types';

export function listenNotifications(
  institutionId?: string,
  recipientUid?: string,
  studentId?: string,
  maxResults = 50,
  callback?: (notifs: SchoolNotification[]) => void
) {
  const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(maxResults));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: SchoolNotification[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SchoolNotification);
      });
      if (callback) callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar notificações:', err);
    }
  );
}

export async function createNotification(
  notifData: Omit<SchoolNotification, 'id' | 'isRead' | 'createdAt'>
): Promise<string> {
  const newRef = doc(collection(db, 'notifications'));
  await setDoc(newRef, {
    ...notifData,
    id: newRef.id,
    isRead: false,
    createdAt: serverTimestamp(),
  });
  return newRef.id;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const ref = doc(db, 'notifications', notificationId);
  await updateDoc(ref, {
    isRead: true,
    updatedAt: serverTimestamp(),
  });
}
