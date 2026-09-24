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
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/lib/types';

export const DEFAULT_TEACHERS: UserProfile[] = [
  {
    uid: 'prof_manuel_01',
    name: 'Prof. Manuel Domingos',
    email: 'manuel.domingos@alo-mae.co.ao',
    phone: '+244 923 111 222',
    role: 'professor',
    schoolId: 'inst_horizonte_01',
    title: 'Coordenador Pedagógico / Matemática',
    classIds: ['turma_1a', 'turma_3c'],
    active: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  },
  {
    uid: 'prof_ana_02',
    name: 'Prof.ª Ana Paula Silva',
    email: 'ana.silva@alo-mae.co.ao',
    phone: '+244 924 333 444',
    role: 'professor',
    schoolId: 'inst_horizonte_01',
    title: 'Docente de Língua Portuguesa',
    classIds: ['turma_2b', 'turma_3c'],
    active: true,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
  },
];

export const DEFAULT_PARENTS: UserProfile[] = [
  {
    uid: 'parent_std-1',
    name: 'Fernanda Silva',
    email: 'fernanda.silva@email.com',
    phone: '+244 923 884 912',
    role: 'pai',
    schoolIds: ['inst_horizonte_01', 'inst_externato_sagrada_familia'],
    studentIds: ['std-1', 'aluno_ext_991'],
    active: true,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
  },
  {
    uid: 'parent_std-2',
    name: 'Ricardo Santos',
    email: 'ricardo.santos@email.com',
    phone: '+244 924 551 092',
    role: 'pai',
    schoolIds: ['inst_horizonte_01'],
    studentIds: ['std-2'],
    active: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  },
  {
    uid: 'parent_std-3',
    name: 'Juliana Oliveira',
    email: 'juliana.oliveira@email.com',
    phone: '+244 926 773 118',
    role: 'pai',
    schoolIds: ['inst_horizonte_01'],
    studentIds: ['std-3'],
    active: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
  },
];

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as UserProfile;
  } catch (error) {
    console.error('Erro ao buscar perfil de utilizador:', error);
    return null;
  }
}

export async function getTeachers(schoolId: string = 'inst_horizonte_01'): Promise<UserProfile[]> {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'professor'),
      where('schoolId', '==', schoolId)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      for (const t of DEFAULT_TEACHERS) {
        await setDoc(doc(db, 'users', t.uid), {
          ...t,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      return DEFAULT_TEACHERS;
    }

    return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
  } catch (error) {
    console.warn('Erro ao buscar professores do Firestore, a utilizar dados em memória:', error);
    return DEFAULT_TEACHERS;
  }
}

export async function enrollTeacherService(
  teacher: {
    uid?: string;
    name: string;
    email: string;
    phone: string;
    title?: string;
  },
  classIds: string[],
  schoolId: string = 'inst_horizonte_01'
): Promise<string> {
  const teacherUid = teacher.uid || `prof_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const teacherRef = doc(db, 'users', teacherUid);

  await setDoc(teacherRef, {
    id: teacherUid,
    uid: teacherUid,
    name: teacher.name.trim(),
    email: teacher.email.trim().toLowerCase(),
    phone: teacher.phone.trim(),
    role: 'professor',
    schoolId,
    title: teacher.title || 'Docente',
    classIds,
    active: true,
    mustChangePassword: true,
    createdBy: 'institution',
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });

  // Atualizar as turmas com o professor
  for (const cId of classIds) {
    try {
      const classRef = doc(db, 'classes', cId);
      await updateDoc(classRef, {
        teacherIds: arrayUnion(teacherUid),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn(`Erro ao vincular professor à turma ${cId}:`, e);
    }
  }

  return teacherUid;
}

export async function getParents(schoolId: string = 'inst_horizonte_01'): Promise<UserProfile[]> {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'pai')
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      for (const p of DEFAULT_PARENTS) {
        await setDoc(doc(db, 'users', p.uid), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      return DEFAULT_PARENTS;
    }

    // Filtrar utilizadores que tenham filhos ou pertençam à escola
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
      .filter(p => {
        const schoolIds = (p as any).schoolIds || (p.schoolId ? [p.schoolId] : []);
        return schoolIds.includes(schoolId) || schoolIds.length === 0;
      });
  } catch (error) {
    console.warn('Erro ao buscar pais do Firestore, a utilizar dados em memória:', error);
    return DEFAULT_PARENTS;
  }
}

export async function updateParentContact(
  uid: string,
  data: { name: string; phone: string; avatarUrl?: string }
): Promise<void> {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    name: data.name.trim(),
    phone: data.phone.trim(),
    ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
    updatedAt: serverTimestamp(),
  });
}
