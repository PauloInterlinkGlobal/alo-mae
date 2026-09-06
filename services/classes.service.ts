import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SchoolClass, TeacherAssignment } from '@/lib/types';

// Fallback pré-definido para início de operações
export const DEFAULT_CLASSES: SchoolClass[] = [
  {
    id: 'turma_1a',
    name: '1º Ano A - Manhã',
    schoolId: 'inst_horizonte_01',
    teacherIds: ['prof_manuel_01'],
    studentCount: 24,
    active: true,
  },
  {
    id: 'turma_2b',
    name: '2º Ano B - Tarde',
    schoolId: 'inst_horizonte_01',
    teacherIds: ['prof_ana_02'],
    studentCount: 28,
    active: true,
  },
  {
    id: 'turma_3c',
    name: '3º Ano C - Manhã',
    schoolId: 'inst_horizonte_01',
    teacherIds: ['prof_manuel_01', 'prof_ana_02'],
    studentCount: 22,
    active: true,
  },
  {
    id: 'turma_4a',
    name: '4º Ano A - Manhã',
    schoolId: 'inst_horizonte_01',
    teacherIds: [],
    studentCount: 19,
    active: true,
  },
];

export async function getClasses(schoolId: string = 'inst_horizonte_01'): Promise<SchoolClass[]> {
  try {
    const q = query(
      collection(db, 'classes'),
      where('schoolId', '==', schoolId)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // Se ainda não existir no Firestore, provisionar as classes por omissão
      for (const c of DEFAULT_CLASSES) {
        await setDoc(doc(db, 'classes', c.id), {
          ...c,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      return DEFAULT_CLASSES;
    }

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || 'Turma sem Nome',
        schoolId: data.schoolId || schoolId,
        teacherIds: Array.isArray(data.teacherIds) ? data.teacherIds : [],
        studentCount: typeof data.studentCount === 'number' ? data.studentCount : 0,
        active: data.active !== false,
      } as SchoolClass;
    });
  } catch (error) {
    console.warn('Erro ao consultar coleção classes do Firestore, a utilizar dados em memória:', error);
    return DEFAULT_CLASSES;
  }
}

export async function createClass(classData: {
  name: string;
  schoolId?: string;
  teacherIds?: string[];
}): Promise<string> {
  const schoolId = classData.schoolId || 'inst_horizonte_01';
  const cleanId = `turma_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const ref = doc(db, 'classes', cleanId);

  await setDoc(ref, {
    id: cleanId,
    name: classData.name.trim(),
    schoolId,
    teacherIds: classData.teacherIds || [],
    studentCount: 0,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return cleanId;
}

export async function updateClass(
  classId: string,
  classData: Partial<{
    name: string;
    teacherIds: string[];
    studentCount: number;
    active: boolean;
  }>
): Promise<void> {
  const ref = doc(db, 'classes', classId);
  await updateDoc(ref, {
    ...classData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteClass(classId: string): Promise<void> {
  const ref = doc(db, 'classes', classId);
  await deleteDoc(ref);
}

export async function assignTeacherToClass(
  assignment: Omit<TeacherAssignment, 'id' | 'createdAt'>
): Promise<string> {
  const newRef = doc(collection(db, 'teacherAssignments'));
  await setDoc(newRef, {
    ...assignment,
    id: newRef.id,
    active: true,
    createdAt: serverTimestamp(),
  });
  return newRef.id;
}
