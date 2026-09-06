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
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MedicalClinic, MedicalGuide, MedicalGuideStatus } from '@/lib/types';
import { recordAuditLog } from './audit.service';

export function listenMedicalClinics(callback?: (clinics: MedicalClinic[]) => void) {
  const q = query(collection(db, 'medicalClinics'), where('active', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: MedicalClinic[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as MedicalClinic);
      });
      if (callback) callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar clínicas médicas:', err);
    }
  );
}

export function listenMedicalGuides(
  institutionId?: string,
  studentId?: string,
  callback?: (guides: MedicalGuide[]) => void
) {
  let q = query(collection(db, 'medicalGuides'), orderBy('createdAt', 'desc'));
  if (studentId) {
    q = query(collection(db, 'medicalGuides'), where('studentId', '==', studentId));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const list: MedicalGuide[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as MedicalGuide);
      });
      if (callback) callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar guias médicas:', err);
    }
  );
}

export async function createMedicalGuide(
  data: Omit<MedicalGuide, 'id' | 'guideNumber' | 'issuedAt' | 'createdAt' | 'updatedAt'>,
  actor: { uid: string; name: string; role: string }
): Promise<MedicalGuide> {
  const newRef = doc(collection(db, 'medicalGuides'));
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-PT');
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const issuedAtStr = `${dateStr} às ${timeStr}`;

  const guideNumber = `GM-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const payload: MedicalGuide = {
    ...data,
    id: newRef.id,
    guideNumber,
    issuedAt: issuedAtStr,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newRef, payload);

  await recordAuditLog({
    institutionId: data.institutionId || 'school_horizonte_luanda',
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'issue_medical_guide',
    entityType: 'medicalGuides',
    entityId: newRef.id,
    description: `Emitiu Guia Médica Nº ${guideNumber} para o aluno ${data.studentName} na clínica ${data.clinicName}`,
    newData: payload,
  });

  return payload;
}

export async function updateMedicalGuideStatus(
  guideId: string,
  status: MedicalGuideStatus,
  actor: { uid: string; name: string; role: string }
): Promise<void> {
  const ref = doc(db, 'medicalGuides', guideId);
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });

  await recordAuditLog({
    institutionId: 'school_horizonte_luanda',
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    action: status === 'cancelled' ? 'cancel_medical_guide' : 'issue_medical_guide',
    entityType: 'medicalGuides',
    entityId: guideId,
    description: `Atualizou estado da Guia Médica ${guideId} para ${status}`,
  });
}
