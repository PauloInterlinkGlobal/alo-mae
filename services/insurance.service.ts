import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  InsuranceProvider,
  InsurancePolicy,
  StudentInsurance,
  StudentMedical,
  GuiaMedica,
} from '@/lib/types';

export async function getInsuranceProviders(): Promise<InsuranceProvider[]> {
  try {
    const q = query(collection(db, 'insuranceProviders'), where('active', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InsuranceProvider));
  } catch (error) {
    console.error('Erro ao buscar seguradoras:', error);
    return [];
  }
}

export async function getStudentInsurance(studentId: string): Promise<StudentInsurance | null> {
  try {
    const q = query(
      collection(db, 'studentInsurance'),
      where('studentId', '==', studentId),
      where('active', '==', true)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as StudentInsurance;
  } catch (error) {
    console.error('Erro ao buscar seguro do aluno:', error);
    return null;
  }
}

export async function getStudentMedical(studentId: string): Promise<StudentMedical | null> {
  try {
    const snap = await getDoc(doc(db, 'studentMedical', studentId));
    if (!snap.exists()) return null;
    return { studentId, ...snap.data() } as StudentMedical;
  } catch (error) {
    console.error('Erro ao buscar ficha médica do aluno:', error);
    return null;
  }
}

export async function updateStudentMedical(
  studentId: string,
  data: Partial<StudentMedical>
): Promise<void> {
  const ref = doc(db, 'studentMedical', studentId);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
