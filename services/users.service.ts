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
import { db, auth } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/lib/types';
import { recordAuditLog } from './audit.service';

export const DEFAULT_TEACHERS: UserProfile[] = [
  {
    uid: 'user_prof_maria',
    name: 'Maria Santos',
    email: 'maria.santos@alo-mae.co.ao',
    phone: '+244 912 340 556',
    role: 'professor',
    schoolId: 'school_horizonte_luanda',
    schoolIds: ['school_horizonte_luanda', 'inst_horizonte_01'],
    title: 'Professora Titular de Língua Portuguesa',
    classIds: ['turma_1A', 'turma_1a'],
    status: 'active',
    active: true,
    authProvider: 'password',
    avatarUrl: 'https://images.unsplash.com/photo-1580894732488-82550bfa3f80?w=400&auto=format&fit=crop&q=80',
  },
  {
    uid: 'user_prof_teste1',
    name: 'Professor Teste 1',
    email: 'prof.teste1@alo-mae.co.ao',
    phone: '+244 923 111 002',
    role: 'professor',
    schoolId: 'school_horizonte_luanda',
    schoolIds: ['school_horizonte_luanda', 'inst_horizonte_01'],
    title: 'Docente de Ciências Naturais',
    classIds: ['turma_2A', 'turma_2b'],
    status: 'active',
    active: true,
    authProvider: 'password',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  },
  {
    uid: 'prof_manuel_01',
    name: 'Prof. Manuel Domingos',
    email: 'manuel.domingos@alo-mae.co.ao',
    phone: '+244 923 111 222',
    role: 'professor',
    schoolId: 'school_horizonte_luanda',
    schoolIds: ['school_horizonte_luanda', 'inst_horizonte_01'],
    title: 'Coordenador Pedagógico / Matemática',
    classIds: ['turma_3A', 'turma_1a', 'turma_3c'],
    status: 'active',
    active: true,
    authProvider: 'password',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  },
  {
    uid: 'prof_ana_02',
    name: 'Prof.ª Ana Paula Silva',
    email: 'ana.silva@alo-mae.co.ao',
    phone: '+244 924 333 444',
    role: 'professor',
    schoolId: 'school_horizonte_luanda',
    schoolIds: ['school_horizonte_luanda', 'inst_horizonte_01'],
    title: 'Docente de Língua Portuguesa e História',
    classIds: ['turma_1A', 'turma_2b', 'turma_3c'],
    status: 'active',
    active: true,
    authProvider: 'password',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
  },
];

export const DEFAULT_PARENTS: UserProfile[] = [
  {
    uid: 'user_pai_fernanda',
    name: 'Fernanda Silva',
    email: 'fernanda.silva@email.com',
    phone: '+244 923 884 912',
    role: 'pai',
    schoolId: 'school_horizonte_luanda',
    schoolIds: ['school_horizonte_luanda', 'inst_horizonte_01'],
    studentIds: ['student_001', 'student_002', 'std-1', 's1'],
    status: 'active',
    active: true,
    authProvider: 'password',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
  },
  {
    uid: 'user_pai_teste1',
    name: 'Encarregado Teste 1',
    email: 'pai.teste1@alo-mae.co.ao',
    phone: '+244 924 551 092',
    role: 'pai',
    schoolId: 'school_horizonte_luanda',
    schoolIds: ['school_horizonte_luanda', 'inst_horizonte_01'],
    studentIds: ['student_003', 'student_004', 'std-2', 's2'],
    status: 'active',
    active: true,
    authProvider: 'password',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
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

    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
      .filter(t => t.status !== 'pending' && t.status !== 'rejected');
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

    // Filtrar utilizadores que tenham filhos ou pertençam à escola e que não estejam pendentes/rejeitados
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
      .filter(p => {
        if (p.status === 'pending' || p.status === 'rejected') return false;
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

/**
 * Recupera cadastros pendentes de aprovação ou em análise pela instituição.
 */
export async function getPendingRegistrations(role?: 'pai' | 'professor'): Promise<UserProfile[]> {
  try {
    let q;
    if (role) {
      q = query(collection(db, 'users'), where('role', '==', role));
    } else {
      q = query(collection(db, 'users'));
    }
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
      .filter(u => u.status === 'pending' || u.status === 'rejected' || u.status === 'suspended' || u.createdBy === 'self-google')
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
  } catch (error) {
    console.warn('Erro ao carregar registos pendentes:', error);
    return [];
  }
}

/**
 * Analisa e altera o estado do cadastro de um utilizador (Aprovar, Rejeitar ou Suspender).
 * Apenas utilizadores autorizados da instituição podem executar.
 */
export async function reviewUserRegistrationService(
  uid: string,
  action: 'approve' | 'reject' | 'suspend',
  schoolId: string = 'inst_horizonte_01'
): Promise<void> {
  const currentAdmin = auth.currentUser;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error('Utilizador não encontrado no sistema.');
  }

  const existingData = snap.data() as UserProfile;
  const newStatus = action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : 'suspended';
  const newActive = action === 'approve';

  const updateData: Record<string, any> = {
    status: newStatus,
    active: newActive,
    updatedAt: serverTimestamp(),
  };

  if (action === 'approve') {
    if (!existingData.schoolId) {
      updateData.schoolId = schoolId;
    }
    if (!existingData.schoolIds || existingData.schoolIds.length === 0) {
      updateData.schoolIds = [schoolId];
    }
  }

  await updateDoc(userRef, updateData);

  // Registo de auditoria institucional
  await recordAuditLog({
    institutionId: schoolId,
    actorUid: currentAdmin?.uid || 'admin_instituicao',
    actorName: currentAdmin?.displayName || currentAdmin?.email || 'Administração',
    actorRole: 'instituicao',
    action: `registration_${action}`,
    entityType: 'users',
    entityId: uid,
    description: `Registo de ${existingData.role} (${existingData.name} - ${existingData.email}) foi ${
      action === 'approve' ? 'aprovado' : action === 'reject' ? 'rejeitado' : 'suspenso'
    }`,
    timestamp: serverTimestamp(),
  }).catch(() => null);
}

