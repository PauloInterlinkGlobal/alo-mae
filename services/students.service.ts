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
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Student, GuardianStudentLink, BiometricProfile } from '@/lib/types';
import { INITIAL_STUDENTS } from '@/lib/mock-data';
import { generateSeedEmbeddingForStudent } from '@/lib/biometrics/engine';

export async function searchParentByContact(term: string): Promise<{
  uid: string;
  name: string;
  email: string;
  phone: string;
  studentIds?: string[];
  schoolIds?: string[];
} | null> {
  const cleanTerm = term.trim().toLowerCase();
  const cleanPhone = term.replace(/[^\d+]/g, '');

  try {
    const usersRef = collection(db, 'users');
    
    // Pesquisar por email
    if (cleanTerm.includes('@')) {
      const emailQuery = query(usersRef, where('email', '==', cleanTerm));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
        const d = emailSnap.docs[0];
        const data = d.data();
        return {
          uid: d.id,
          name: data.name || data.nome || 'Encarregado',
          email: data.email,
          phone: data.phone || data.telefone || '',
          studentIds: data.studentIds || [],
          schoolIds: data.schoolIds || (data.schoolId ? [data.schoolId] : []),
        };
      }
    }

    // Pesquisar por telefone
    if (cleanPhone.length >= 6) {
      const phoneQuery = query(usersRef, where('phone', '==', cleanPhone));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) {
        const d = phoneSnap.docs[0];
        const data = d.data();
        return {
          uid: d.id,
          name: data.name || data.nome || 'Encarregado',
          email: data.email || '',
          phone: data.phone || data.telefone || cleanPhone,
          studentIds: data.studentIds || [],
          schoolIds: data.schoolIds || (data.schoolId ? [data.schoolId] : []),
        };
      }
    }

    return null;
  } catch (err) {
    console.warn('Erro ao pesquisar encarregado no Firestore:', err);
    return null;
  }
}

export async function enrollStudentService(input: {
  student: {
    matricula: string;
    name: string;
    classId: string;
    photoUrl?: string;
    biometricCode: string;
    insurancePolicyId?: string;
  };
  parent: {
    uid?: string;
    name: string;
    email: string;
    phone: string;
  };
  schoolId?: string;
}): Promise<string> {
  const schoolId = input.schoolId || 'inst_horizonte_01';
  const matricula = input.student.matricula.trim();
  const studentId = `std_${schoolId}_${matricula.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  let parentUid = input.parent.uid;
  if (!parentUid) {
    parentUid = `parent_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  }

  // 1. Atualizar ou criar o Pai
  const parentRef = doc(db, 'users', parentUid);
  await setDoc(parentRef, {
    id: parentUid,
    name: input.parent.name.trim(),
    email: input.parent.email.trim().toLowerCase(),
    phone: input.parent.phone.trim(),
    role: 'pai',
    studentIds: arrayUnion(studentId),
    schoolIds: arrayUnion(schoolId),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 2. Criar ou atualizar o Aluno
  const studentRef = doc(db, 'students', studentId);
  const studentData = {
    id: studentId,
    matricula,
    name: input.student.name.trim(),
    fullName: input.student.name.trim(),
    classId: input.student.classId,
    schoolId,
    parentUid,
    parentName: input.parent.name.trim(),
    parentPhone: input.parent.phone.trim(),
    parentEmail: input.parent.email.trim().toLowerCase(),
    photoUrl: input.student.photoUrl || `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=400&auto=format&fit=crop&q=80`,
    status: 'absent',
    biometricCode: input.student.biometricCode,
    biometricProfile: generateSeedEmbeddingForStudent(matricula),
    insurancePolicyId: input.student.insurancePolicyId || 'SEG-ALO-2024-8821',
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await setDoc(studentRef, studentData, { merge: true });

  // 3. Incrementar studentCount na turma
  try {
    const classRef = doc(db, 'classes', input.student.classId);
    await updateDoc(classRef, {
      studentCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Não foi possível incrementar contador da turma:', err);
  }

  return studentId;
}

export async function getStudents(schoolId: string = 'inst_horizonte_01'): Promise<Student[]> {
  try {
    const q = query(collection(db, 'students'), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);

    if (snap.empty) {
      // Salvar os alunos padrão caso a coleção esteja vazia
      for (const st of INITIAL_STUDENTS) {
        await setDoc(doc(db, 'students', st.id), {
          ...st,
          schoolId,
          parentUid: `parent_${st.id}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      return INITIAL_STUDENTS.map(s => ({ ...s, schoolId }));
    }

    return snap.docs.map((d) => {
      const data = d.data() as Student;
      return {
        ...data,
        id: d.id,
        name: data.fullName || data.name || 'Aluno',
        classId: data.classId || (data as any).currentClassId || 'turma_1a',
      };
    });
  } catch (error) {
    console.warn('Erro ao carregar alunos do Firestore, a utilizar dados em memória:', error);
    return INITIAL_STUDENTS.map(s => ({ ...s, schoolId }));
  }
}

export async function updateStudent(studentId: string, data: Partial<Student>): Promise<void> {
  const ref = doc(db, 'students', studentId);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateStudentBiometricProfile(
  studentId: string,
  profile: BiometricProfile
): Promise<void> {
  const ref = doc(db, 'students', studentId);
  await updateDoc(ref, {
    biometricProfile: profile,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteStudent(studentId: string, classId?: string): Promise<void> {
  const ref = doc(db, 'students', studentId);
  await deleteDoc(ref);

  if (classId) {
    try {
      const classRef = doc(db, 'classes', classId);
      await updateDoc(classRef, {
        studentCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Erro ao decrementar contador de alunos na turma:', e);
    }
  }
}
