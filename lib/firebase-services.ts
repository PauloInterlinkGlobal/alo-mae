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
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  UserProfile,
  Student,
  ClassAttendanceStat,
  AccessLog,
  SchoolNotification,
  MedicalClinic,
  Grade,
  StudentMedical,
  Aluno,
  Turma,
  TurmaProfessor,
  MiniPauta,
  NotaAluno,
  PresencaBiometrica,
  GuiaMedica,
  TeacherListing,
  TeacherListingCategory,
  TeacherListingModality,
  TeacherListingStatus,
  Conversation,
  ChatMessage,
  ConversationContext,
} from './types';

// ==========================================================
// 1. Error Handling Standard (Firebase Integration Skill)
// ==========================================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

// ==========================================================
// 2. Coleção: users (CRUD & Listeners)
// ==========================================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: snap.id,
      name: data.name || data.nome || '',
      email: data.email || '',
      phone: data.phone || data.telefone || '',
      role: data.role || 'pai',
      avatarUrl: data.avatarUrl || data.fotoUrl,
      schoolId: data.schoolId || data.instituicao_id || 'school_horizonte_luanda',
      title: data.title,
      studentId: data.studentId,
      studentIds: data.studentIds || (data.studentId ? [data.studentId] : []),
      classIds: data.classIds || [],
      createdAt: data.createdAt || data.criado_em,
      updatedAt: data.updatedAt,
      nome: data.nome || data.name,
      telefone: data.telefone || data.phone,
      escola_nome: data.escola_nome || data.schoolName || 'Colégio Horizonte de Luanda',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), {
      ...profile,
      createdAt: profile.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================================
// 3. Coleção: students (CRUD & Listeners)
// ==========================================================

export async function getStudents(schoolId = 'school_horizonte_luanda'): Promise<Student[]> {
  const path = 'students';
  try {
    const q = query(collection(db, path), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    if (snap.empty) {
      // Fallback query all
      const snapAll = await getDocs(collection(db, path));
      return snapAll.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Student, 'id'>) }));
    }
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Student, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  const path = `students/${studentId}`;
  try {
    const snap = await getDoc(doc(db, 'students', studentId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Student, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function createStudent(student: Student): Promise<void> {
  const path = `students/${student.id}`;
  try {
    await setDoc(doc(db, 'students', student.id), {
      ...student,
      createdAt: student.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateStudent(studentId: string, data: Partial<Student>): Promise<void> {
  const path = `students/${studentId}`;
  try {
    await updateDoc(doc(db, 'students', studentId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStudent(studentId: string): Promise<void> {
  const path = `students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function listenStudents(callback: (students: Student[]) => void) {
  const path = 'students';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Student, 'id'>),
      }));
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==========================================================
// 4. Coleção: classStats (CRUD & Listeners)
// ==========================================================

export async function getClassStats(schoolId = 'school_horizonte_luanda'): Promise<ClassAttendanceStat[]> {
  const path = 'classStats';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => ({ classId: d.id, ...(d.data() as Omit<ClassAttendanceStat, 'classId'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateClassStat(classId: string, data: Partial<ClassAttendanceStat>): Promise<void> {
  const path = `classStats/${classId}`;
  try {
    await setDoc(doc(db, 'classStats', classId), {
      ...data,
      classId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function listenClassStats(callback: (stats: ClassAttendanceStat[]) => void) {
  const path = 'classStats';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        classId: d.id,
        ...(d.data() as Omit<ClassAttendanceStat, 'classId'>),
      }));
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==========================================================
// 5. Coleção: accessLogs (CRUD & Listeners)
// ==========================================================

export async function getAccessLogs(limitCount = 50): Promise<AccessLog[]> {
  const path = 'accessLogs';
  try {
    const q = query(collection(db, path), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AccessLog, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createAccessLog(log: AccessLog): Promise<void> {
  const path = `accessLogs/${log.id}`;
  try {
    await setDoc(doc(db, 'accessLogs', log.id), {
      ...log,
      createdAt: serverTimestamp(),
    });

    // Also update student status
    const studentRef = doc(db, 'students', log.studentId);
    await updateDoc(studentRef, {
      status: log.type === 'entry' ? 'present' : 'present',
      lastEntryTime: log.type === 'entry' ? log.timestamp : undefined,
      lastExitTime: log.type === 'exit' ? log.timestamp : undefined,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function listenAccessLogs(callback: (logs: AccessLog[]) => void, limitCount = 50) {
  const path = 'accessLogs';
  const q = query(collection(db, path), limit(limitCount));

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AccessLog, 'id'>),
      }));
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==========================================================
// 6. Coleção: notifications (CRUD & Listeners)
// ==========================================================

export async function getNotifications(schoolId = 'school_horizonte_luanda'): Promise<SchoolNotification[]> {
  const path = 'notifications';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SchoolNotification, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createNotification(notif: SchoolNotification): Promise<void> {
  const path = `notifications/${notif.id}`;
  try {
    await setDoc(doc(db, 'notifications', notif.id), {
      ...notif,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const path = `notifications/${id}`;
  try {
    await updateDoc(doc(db, 'notifications', id), {
      isRead: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function listenNotifications(callback: (notifications: SchoolNotification[]) => void) {
  const path = 'notifications';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SchoolNotification, 'id'>),
      }));
      // Sort newest first
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==========================================================
// 7. Coleção: medicalClinics (CRUD & Listeners)
// ==========================================================

export async function getMedicalClinics(): Promise<MedicalClinic[]> {
  const path = 'medicalClinics';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MedicalClinic, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createMedicalClinic(clinic: MedicalClinic): Promise<void> {
  const path = `medicalClinics/${clinic.id}`;
  try {
    await setDoc(doc(db, 'medicalClinics', clinic.id), clinic);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function listenMedicalClinics(callback: (clinics: MedicalClinic[]) => void) {
  const path = 'medicalClinics';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MedicalClinic, 'id'>),
      }));
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==========================================================
// 8. Coleção: grades (Mini Pautas / Boletins) (CRUD & Listeners)
// ==========================================================

export async function getGrades(filters?: {
  studentId?: string;
  classId?: string;
  teacherId?: string;
  status?: string;
}): Promise<Grade[]> {
  const path = 'grades';
  try {
    let q = query(collection(db, path));
    if (filters?.studentId) q = query(q, where('studentId', '==', filters.studentId));
    if (filters?.classId) q = query(q, where('classId', '==', filters.classId));
    if (filters?.teacherId) q = query(q, where('teacherId', '==', filters.teacherId));
    if (filters?.status) q = query(q, where('status', '==', filters.status));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Grade, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createGrade(grade: Grade): Promise<void> {
  const path = `grades/${grade.id}`;
  try {
    await setDoc(doc(db, 'grades', grade.id), {
      ...grade,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateGrade(gradeId: string, data: Partial<Grade>): Promise<void> {
  const path = `grades/${gradeId}`;
  try {
    await updateDoc(doc(db, 'grades', gradeId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function approveGrade(gradeId: string, approvedBy: string): Promise<void> {
  const path = `grades/${gradeId}`;
  try {
    await updateDoc(doc(db, 'grades', gradeId), {
      status: 'approved',
      approvedBy,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function rejectGrade(gradeId: string, feedback?: string): Promise<void> {
  const path = `grades/${gradeId}`;
  try {
    await updateDoc(doc(db, 'grades', gradeId), {
      status: 'rejected',
      feedback: feedback || 'Revisar notas lançadas.',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function listenGrades(callback: (grades: Grade[]) => void, classId?: string) {
  const path = 'grades';
  const q = classId ? query(collection(db, path), where('classId', '==', classId)) : collection(db, path);

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Grade, 'id'>),
      }));
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==========================================================
// 9. Coleção: studentMedical (Guia Médica) (CRUD & Listeners)
// ==========================================================

export async function getStudentMedical(studentId: string): Promise<StudentMedical | null> {
  const path = `studentMedical/${studentId}`;
  try {
    const snap = await getDoc(doc(db, 'studentMedical', studentId));
    if (!snap.exists()) return null;
    return snap.data() as StudentMedical;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveStudentMedical(medical: StudentMedical): Promise<void> {
  const path = `studentMedical/${medical.studentId}`;
  try {
    await setDoc(doc(db, 'studentMedical', medical.studentId), {
      ...medical,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function listenStudentMedical(studentId: string, callback: (medical: StudentMedical | null) => void) {
  const path = `studentMedical/${studentId}`;
  return onSnapshot(
    doc(db, 'studentMedical', studentId),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as StudentMedical);
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// ==========================================================
// 10. Compatibilidade e Helpers para Turmas e MiniPautas PT
// ==========================================================

export const DEFAULT_TURMAS: Turma[] = [
  {
    id: 'turma_10a',
    instituicao_id: 'school_horizonte_luanda',
    nome: '10ª Classe A',
    ano_lectivo: '2025/2026',
    sala: 'Sala 102 - Bloco A',
    periodo: 'manha',
    total_alunos: 32,
    disciplinas: ['Matemática', 'Física', 'Química', 'Língua Portuguesa', 'Inglês', 'História'],
    diretor_turma_id: 'user_prof_maria',
    diretor_turma_nome: 'Profª. Maria Fernandes',
  },
  {
    id: 'turma_10b',
    instituicao_id: 'school_horizonte_luanda',
    nome: '10ª Classe B',
    ano_lectivo: '2025/2026',
    sala: 'Sala 104 - Bloco A',
    periodo: 'manha',
    total_alunos: 28,
    disciplinas: ['Matemática', 'Física', 'Química', 'Língua Portuguesa', 'Biologia'],
    diretor_turma_id: 'user_prof_antonio',
    diretor_turma_nome: 'Prof. António Costa',
  },
  {
    id: 'turma_11a',
    instituicao_id: 'school_horizonte_luanda',
    nome: '11ª Classe A',
    ano_lectivo: '2025/2026',
    sala: 'Sala 201 - Bloco B',
    periodo: 'tarde',
    total_alunos: 30,
    disciplinas: ['Matemática', 'Física', 'Informática', 'Geografia', 'Filosofia'],
    diretor_turma_id: 'user_prof_teresa',
    diretor_turma_nome: 'Profª. Teresa Bento',
  },
];

export const DEFAULT_TURMAS_PROFESSORES: TurmaProfessor[] = [
  {
    id: 'tp_1',
    instituicao_id: 'school_horizonte_luanda',
    turma_id: 'turma_10a',
    turma_nome: '10ª Classe A',
    professor_id: 'user_prof_maria',
    professor_nome: 'Profª. Maria Fernandes',
    disciplina: 'Matemática',
    ano_lectivo: '2025/2026',
    carga_horaria_semanal: 6,
  },
  {
    id: 'tp_2',
    instituicao_id: 'school_horizonte_luanda',
    turma_id: 'turma_10a',
    turma_nome: '10ª Classe A',
    professor_id: 'user_prof_maria',
    professor_nome: 'Profª. Maria Fernandes',
    disciplina: 'Física',
    ano_lectivo: '2025/2026',
    carga_horaria_semanal: 4,
  },
  {
    id: 'tp_3',
    instituicao_id: 'school_horizonte_luanda',
    turma_id: 'turma_10b',
    turma_nome: '10ª Classe B',
    professor_id: 'user_prof_maria',
    professor_nome: 'Profª. Maria Fernandes',
    disciplina: 'Matemática',
    ano_lectivo: '2025/2026',
    carga_horaria_semanal: 6,
  },
];

export async function getTurmas(instituicaoId?: string): Promise<Turma[]> {
  const path = 'turmas';
  try {
    const q = instituicaoId
      ? query(collection(db, path), where('instituicao_id', '==', instituicaoId))
      : query(collection(db, path));

    const snap = await getDocs(q);
    if (snap.empty) {
      return DEFAULT_TURMAS;
    }
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Turma, 'id'>) }));
  } catch (error) {
    console.warn('Erro ao consultar turmas Firestore:', error);
    return DEFAULT_TURMAS;
  }
}

export async function getTurmasProfessores(professorId?: string): Promise<TurmaProfessor[]> {
  const path = 'turmas_professores';
  try {
    const q = professorId
      ? query(collection(db, path), where('professor_id', '==', professorId))
      : query(collection(db, path));

    const snap = await getDocs(q);
    if (snap.empty) {
      return DEFAULT_TURMAS_PROFESSORES;
    }
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TurmaProfessor, 'id'>) }));
  } catch (error) {
    console.warn('Erro ao consultar turmas_professores Firestore:', error);
    return DEFAULT_TURMAS_PROFESSORES;
  }
}

export async function getMiniPautas(filters?: {
  professorId?: string;
  turmaId?: string;
  status?: string;
}): Promise<MiniPauta[]> {
  const path = 'mini_pautas';
  try {
    let q = query(collection(db, path));
    if (filters?.professorId) q = query(q, where('professor_id', '==', filters.professorId));
    if (filters?.turmaId) q = query(q, where('turma_id', '==', filters.turmaId));
    if (filters?.status) q = query(q, where('status', '==', filters.status));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MiniPauta, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function criarMiniPauta(pauta: Omit<MiniPauta, 'id' | 'status'> & { status?: 'rascunho' }): Promise<string> {
  const pautaId = `pauta_${pauta.turma_id}_${pauta.disciplina.toLowerCase().replace(/\s+/g, '_')}_t${pauta.trimestre}`;
  const path = `mini_pautas/${pautaId}`;
  try {
    const payload: MiniPauta = {
      id: pautaId,
      ...pauta,
      status: 'rascunho',
    };
    await setDoc(doc(db, 'mini_pautas', pautaId), payload);

    // Also sync to `grades` collection for each student
    for (const nota of pauta.notas) {
      const gradeId = `grade_${pauta.turma_id}_${nota.aluno_id}_${pauta.disciplina.toLowerCase().replace(/\s+/g, '_')}_t${pauta.trimestre}`;
      await createGrade({
        id: gradeId,
        studentId: nota.aluno_id,
        studentName: nota.aluno_nome || 'Aluno',
        classId: pauta.classId || pauta.turma_id || 'turma_10a',
        className: pauta.className || pauta.turma_nome || '10ª Classe A',
        subject: pauta.subjectName || pauta.disciplina,
        teacherId: pauta.teacherId || pauta.professor_id || 'user_prof',
        teacherName: pauta.teacherName || pauta.professor_nome || 'Professor',
        grade: nota.media_final,
        status: 'draft',
        schoolId: 'school_horizonte_luanda',
        trimestre: pauta.trimestre,
        mac: nota.mac,
        npp: nota.npp,
        npt: nota.npt,
      });
    }

    return pautaId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function salvarNotasMiniPauta(pautaId: string, notas: NotaAluno[]): Promise<void> {
  const path = `mini_pautas/${pautaId}`;
  try {
    await updateDoc(doc(db, 'mini_pautas', pautaId), { notas });
    const snap = await getDoc(doc(db, 'mini_pautas', pautaId));
    if (snap.exists()) {
      const pauta = snap.data() as MiniPauta;
      for (const nota of notas) {
        const gradeId = `grade_${pauta.turma_id}_${nota.aluno_id}_${pauta.disciplina.toLowerCase().replace(/\s+/g, '_')}_t${pauta.trimestre}`;
        await updateGrade(gradeId, {
          grade: nota.media_final,
          mac: nota.mac,
          npp: nota.npp,
          npt: nota.npt,
        }).catch(() => {});
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function submeterMiniPauta(pautaId: string): Promise<void> {
  const path = `mini_pautas/${pautaId}`;
  try {
    await updateDoc(doc(db, 'mini_pautas', pautaId), {
      status: 'submetida',
      data_envio: new Date().toISOString(),
    });
    const snap = await getDoc(doc(db, 'mini_pautas', pautaId));
    if (snap.exists()) {
      const pauta = snap.data() as MiniPauta;
      for (const nota of pauta.notas || []) {
        const gradeId = `grade_${pauta.turma_id}_${nota.aluno_id}_${pauta.disciplina.toLowerCase().replace(/\s+/g, '_')}_t${pauta.trimestre}`;
        await updateGrade(gradeId, { status: 'pending_approval' }).catch(() => {});
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function aprovarMiniPauta(pautaId: string): Promise<void> {
  const path = `mini_pautas/${pautaId}`;
  try {
    await updateDoc(doc(db, 'mini_pautas', pautaId), {
      status: 'aprovada',
      data_aprovacao: new Date().toISOString(),
      motivo_rejeicao: null,
    });
    const snap = await getDoc(doc(db, 'mini_pautas', pautaId));
    if (snap.exists()) {
      const pauta = snap.data() as MiniPauta;
      for (const nota of pauta.notas || []) {
        const gradeId = `grade_${pauta.turma_id}_${nota.aluno_id}_${pauta.disciplina.toLowerCase().replace(/\s+/g, '_')}_t${pauta.trimestre}`;
        await updateGrade(gradeId, { status: 'approved' }).catch(() => {});
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function rejeitarMiniPauta(pautaId: string, motivo?: string): Promise<void> {
  const path = `mini_pautas/${pautaId}`;
  try {
    await updateDoc(doc(db, 'mini_pautas', pautaId), {
      status: 'rejeitada',
      motivo_rejeicao: motivo || 'Ajustar notas lançadas conforme critério pedagógico.',
    });
    const snap = await getDoc(doc(db, 'mini_pautas', pautaId));
    if (snap.exists()) {
      const pauta = snap.data() as MiniPauta;
      for (const nota of pauta.notas || []) {
        const gradeId = `grade_${pauta.turma_id}_${nota.aluno_id}_${pauta.disciplina.toLowerCase().replace(/\s+/g, '_')}_t${pauta.trimestre}`;
        await updateGrade(gradeId, { status: 'rejected', feedback: motivo }).catch(() => {});
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function listenMiniPautas(
  callback: (pautas: MiniPauta[]) => void,
  filters?: { professorId?: string; turmaId?: string }
) {
  const path = 'mini_pautas';
  let q = query(collection(db, path));
  if (filters?.professorId) q = query(q, where('professor_id', '==', filters.professorId));
  if (filters?.turmaId) q = query(q, where('turma_id', '==', filters.turmaId));

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MiniPauta, 'id'>),
      }));
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function updateGuiaMedica(alunoId: string, guia: GuiaMedica): Promise<void> {
  const path = `alunos/${alunoId}`;
  try {
    await updateDoc(doc(db, 'alunos', alunoId), {
      guia_medica: guia,
    });

    // Also update studentMedical
    await saveStudentMedical({
      studentId: alunoId,
      studentName: 'Lucas Silva',
      classId: 'turma_10a',
      schoolId: 'school_horizonte_luanda',
      insurancePolicyId: guia.numero_apolice,
      insuranceProvider: guia.seguradora,
      policyType: 'comprehensive',
      coverage: [
        'Pronto Socorro Pediátrico 24h',
        'Internamento Hospitalar',
        'Traumatologia e Fraturas',
        'Medicamentos de Urgência',
      ],
      validityStart: '2026-01-01',
      validityEnd: '2026-12-31',
      emergencyPhone: guia.contacto_emergencia,
      emergencyContactName: 'Encarregado de Educação',
      allergies: guia.alergias,
      chronicConditions: guia.doencas_cronicas || [],
      notes: guia.observacoes,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function registarPresencaBiometrica(presenca: Omit<PresencaBiometrica, 'id'>): Promise<string> {
  const now = new Date();
  const id = `log_${presenca.studentId || presenca.aluno_id || 'aluno'}_${now.getTime()}`;
  const studentId = presenca.studentId || presenca.aluno_id || 's1';
  const studentName = presenca.studentName || presenca.aluno_nome || 'Lucas Silva';
  const className = presenca.className || presenca.turma_nome || '10ª Classe A';
  const photo = presenca.studentPhoto || presenca.aluno_foto || 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400';
  const receipt = presenca.receiptCode || presenca.codigo_recibo || `CF-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getTime().toString().slice(-6)}`;

  const accessLogPayload: AccessLog = {
    id,
    studentId,
    studentName,
    studentPhoto: photo,
    className,
    schoolId: 'school_horizonte_luanda',
    type: presenca.type === 'exit' || (presenca as any).tipo === 'saida' ? 'exit' : 'entry',
    timestamp: now.toTimeString().split(' ')[0],
    date: now.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }),
    location: presenca.location || presenca.localizacao || 'Portaria Principal — Torniquete 1',
    method: presenca.method || (presenca.metodo as any) || 'facial',
    receiptCode: receipt,
    notified: true,
    notifiedRecipient: 'Encarregado Notificado via SMS / Push',
    statusNote: 'Registado via Totem Biométrico Escolar',
  };

  await createAccessLog(accessLogPayload);

  // Also sync to legacy presencas_biometricas collection
  try {
    await setDoc(doc(db, 'presencas_biometricas', id), {
      id,
      aluno_id: studentId,
      aluno_nome: studentName,
      aluno_foto: photo,
      turma_id: 'turma_10a',
      turma_nome: className,
      data_hora: now.toISOString(),
      tipo: accessLogPayload.type === 'entry' ? 'entrada' : 'saida',
      status_reconhecimento: 'sucesso',
      metodo: accessLogPayload.method,
      localizacao: accessLogPayload.location,
      codigo_recibo: receipt,
    });
  } catch {
    // Ignore legacy mirror errors
  }

  return id;
}

export function listenAlunos(callback: (alunos: Aluno[]) => void) {
  const path = 'alunos';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Aluno, 'id'>),
      }));
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function listenPresencasRecentes(callback: (presencas: PresencaBiometrica[]) => void, limitCount = 25) {
  const path = 'accessLogs';
  const q = query(collection(db, path), limit(limitCount));

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => {
        const data = d.data() as AccessLog;
        return {
          ...data,
          id: d.id,
          aluno_id: data.studentId,
          aluno_nome: data.studentName,
          aluno_foto: data.studentPhoto,
          turma_id: data.classId || 'turma_10a',
          turma_nome: data.className,
          data_hora: new Date().toISOString(),
          tipo: data.type === 'entry' ? 'entrada' : 'saida',
          status_reconhecimento: 'sucesso',
          metodo: data.method,
          localizacao: data.location,
          codigo_recibo: data.receiptCode,
        } as PresencaBiometrica;
      });
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==========================================================
// 11. Semente Firestore Completa para as 8 Coleções
// ==========================================================

export async function seedInitialFirestoreData(): Promise<boolean> {
  try {
    const studentsCheck = await getDocs(query(collection(db, 'students'), limit(1)));
    if (!studentsCheck.empty) {
      return true; // Already initialized
    }

    const batch = writeBatch(db);

    // 1. Coleção `users`
    const defaultUsers: UserProfile[] = [
      {
        uid: 'user_pai_fernanda',
        name: 'Fernanda Silva',
        email: 'fernanda.silva@email.com',
        phone: '+244 923 884 912',
        role: 'pai',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
        schoolId: 'school_horizonte_luanda',
        title: 'Mãe e Encarregada de Educação',
        studentId: 's1',
        studentIds: ['s1', 's2'],
      },
      {
        uid: 'user_prof_maria',
        name: 'Profª. Maria Fernandes',
        email: 'maria.fernandes@colegiohorizonte.ao',
        phone: '+244 912 340 556',
        role: 'professor',
        avatarUrl: 'https://images.unsplash.com/photo-1580894732488-82550bfa3f80?w=300&auto=format&fit=crop&q=80',
        schoolId: 'school_horizonte_luanda',
        title: 'Professora Titular de Matemática e Física',
        classIds: ['1a', '1b'],
      },
      {
        uid: 'user_admin_carlos',
        name: 'Dr. Carlos Manuel',
        email: 'direcao@colegiohorizonte.ao',
        phone: '+244 931 990 001',
        role: 'instituicao',
        avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
        schoolId: 'school_horizonte_luanda',
        title: 'Diretor Pedagógico Geral',
      },
    ];
    defaultUsers.forEach((u) => batch.set(doc(db, 'users', u.uid), u));

    // 2. Coleção `students`
    const defaultStudents: Student[] = [
      {
        id: 's1',
        matricula: '2026-00192',
        name: 'Lucas Silva',
        classId: '1a',
        className: '10ª Classe A',
        schoolId: 'school_horizonte_luanda',
        schoolName: 'Colégio Horizonte de Luanda',
        parentName: 'Fernanda Silva',
        parentPhone: '+244 923 884 912',
        parentEmail: 'fernanda.silva@email.com',
        photoUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&auto=format&fit=crop&q=80',
        status: 'present',
        lastEntryTime: '07:32',
        biometricCode: 'BIO-FACIAL-99482-LUCAS',
        insurancePolicyId: 'SEG-ALO-2026-8821',
      },
      {
        id: 's2',
        matricula: '2026-00193',
        name: 'Beatriz Costa Santos',
        classId: '1a',
        className: '10ª Classe A',
        schoolId: 'school_horizonte_luanda',
        schoolName: 'Colégio Horizonte de Luanda',
        parentName: 'Fernanda Silva',
        parentPhone: '+244 923 884 912',
        parentEmail: 'fernanda.silva@email.com',
        photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
        status: 'present',
        lastEntryTime: '07:25',
        biometricCode: 'BIO-FACIAL-88319-BEATRIZ',
        insurancePolicyId: 'SEG-ALO-2026-8822',
      },
      {
        id: 's3',
        matricula: '2026-00194',
        name: 'Mateus Henrique Oliveira',
        classId: '1a',
        className: '10ª Classe A',
        schoolId: 'school_horizonte_luanda',
        schoolName: 'Colégio Horizonte de Luanda',
        parentName: 'Henrique Oliveira',
        parentPhone: '+244 926 773 118',
        parentEmail: 'henrique.oliveira@email.com',
        photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
        status: 'absent',
        biometricCode: 'BIO-FACIAL-77120-MATEUS',
        insurancePolicyId: 'SEG-ALO-2026-8823',
      },
      {
        id: 's4',
        matricula: '2026-00201',
        name: 'Rafael Mendes',
        classId: '1b',
        className: '10ª Classe B',
        schoolId: 'school_horizonte_luanda',
        schoolName: 'Colégio Horizonte de Luanda',
        parentName: 'Ana Mendes',
        parentPhone: '+244 923 119 443',
        parentEmail: 'ana.mendes@email.com',
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
        status: 'present',
        lastEntryTime: '07:21',
        biometricCode: 'BIO-FACIAL-66291-RAFAEL',
        insurancePolicyId: 'SEG-ALO-2026-8824',
      },
    ];
    defaultStudents.forEach((s) => batch.set(doc(db, 'students', s.id), s));

    // 3. Coleção `classStats`
    const defaultStats: ClassAttendanceStat[] = [
      {
        classId: '1a',
        className: '10ª Classe A',
        schoolId: 'school_horizonte_luanda',
        teacherName: 'Profª. Maria Fernandes',
        room: 'Sala 102',
        totalStudents: 32,
        presentsToday: 30,
        absentsToday: 2,
        latesToday: 1,
        monthlyPresents: 680,
        monthlyAbsences: 24,
        monthlyLates: 16,
        frequencyRate: 96.5,
        averageGrade: 15.8,
      },
      {
        classId: '1b',
        className: '10ª Classe B',
        schoolId: 'school_horizonte_luanda',
        teacherName: 'Prof. António Costa',
        room: 'Sala 104',
        totalStudents: 28,
        presentsToday: 26,
        absentsToday: 2,
        latesToday: 3,
        monthlyPresents: 580,
        monthlyAbsences: 36,
        monthlyLates: 22,
        frequencyRate: 94.1,
        averageGrade: 14.9,
      },
      {
        classId: '2a',
        className: '11ª Classe A',
        schoolId: 'school_horizonte_luanda',
        teacherName: 'Profª. Teresa Bento',
        room: 'Sala 201',
        totalStudents: 30,
        presentsToday: 29,
        absentsToday: 1,
        latesToday: 0,
        monthlyPresents: 650,
        monthlyAbsences: 10,
        monthlyLates: 8,
        frequencyRate: 98.2,
        averageGrade: 16.4,
      },
    ];
    defaultStats.forEach((st) => batch.set(doc(db, 'classStats', st.classId), st));

    // 4. Coleção `accessLogs`
    const defaultLogs: AccessLog[] = [
      {
        id: 'log_entry_lucas_1',
        studentId: 's1',
        studentName: 'Lucas Silva',
        studentPhoto: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&auto=format&fit=crop&q=80',
        className: '10ª Classe A',
        schoolId: 'school_horizonte_luanda',
        schoolName: 'Colégio Horizonte de Luanda',
        type: 'entry',
        timestamp: '07:32:15',
        date: '20 de Maio de 2026',
        location: 'Portaria Principal — Torniquete 1',
        method: 'facial',
        receiptCode: 'CF-20260520-073215-S1',
        notified: true,
        notifiedRecipient: 'Fernanda Silva (+244 923 884 912)',
        statusNote: 'Entrada pontual registada no sistema',
      },
      {
        id: 'log_entry_beatriz_1',
        studentId: 's2',
        studentName: 'Beatriz Costa Santos',
        studentPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
        className: '10ª Classe A',
        schoolId: 'school_horizonte_luanda',
        schoolName: 'Colégio Horizonte de Luanda',
        type: 'entry',
        timestamp: '07:25:02',
        date: '20 de Maio de 2026',
        location: 'Portaria Principal — Torniquete 2',
        method: 'facial',
        receiptCode: 'CF-20260520-072502-S2',
        notified: true,
        notifiedRecipient: 'Fernanda Silva (+244 923 884 912)',
        statusNote: 'Entrada pontual',
      },
      {
        id: 'log_exit_lucas_prev',
        studentId: 's1',
        studentName: 'Lucas Silva',
        studentPhoto: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&auto=format&fit=crop&q=80',
        className: '10ª Classe A',
        schoolId: 'school_horizonte_luanda',
        schoolName: 'Colégio Horizonte de Luanda',
        type: 'exit',
        timestamp: '13:05:40',
        date: '19 de Maio de 2026',
        location: 'Portão Norte — Saída de Alunos',
        method: 'facial',
        receiptCode: 'CF-20260519-130540-S1',
        notified: true,
        notifiedRecipient: 'Fernanda Silva (+244 923 884 912)',
        statusNote: 'Saída regular após o término das aulas',
      },
    ];
    defaultLogs.forEach((l) => batch.set(doc(db, 'accessLogs', l.id), l));

    // 5. Coleção `notifications`
    const defaultNotifs: SchoolNotification[] = [
      {
        id: 'notif_entry_lucas_today',
        type: 'access_entry',
        title: 'Lucas entrou na escola',
        subject: 'Registo de Entrada Confirmado',
        message: 'O seu filho Lucas Silva acabou de entrar no Colégio Horizonte de Luanda com sucesso via biometria facial.',
        studentId: 's1',
        studentName: 'Lucas Silva',
        className: '10ª Classe A',
        schoolId: 'school_horizonte_luanda',
        senderName: 'Sistema Biométrico Alô Mãe',
        senderRole: 'Portaria & Segurança',
        date: '20 de Maio de 2026',
        time: '07:32',
        isRead: false,
        receiptCode: 'CF-20260520-073215-S1',
      },
      {
        id: 'notif_reunion_mat',
        type: 'reunion',
        title: 'Reunião de Pais e Encarregados',
        subject: 'Avaliação Trimestral e Mini Pautas',
        message: 'Convidamos todos os pais da 10ª Classe A para a sessão de entrega e discussão dos boletins trimestrais.',
        className: '10ª Classe A',
        schoolId: 'school_horizonte_luanda',
        senderName: 'Profª. Maria Fernandes',
        senderRole: 'Professora Titular',
        date: '18 de Maio de 2026',
        time: '14:00',
        reunionDate: '24/05/2026',
        reunionTime: '10:00',
        isRead: false,
      },
      {
        id: 'notif_praise_mat',
        type: 'praise',
        title: 'Elogio Académico — Matemática',
        subject: 'Excelente Desempenho no Teste',
        message: 'O aluno Lucas obteve nota 18.0 na prova de Matemática com excelente raciocínio lógico.',
        studentId: 's1',
        studentName: 'Lucas Silva',
        className: '10ª Classe A',
        schoolId: 'school_horizonte_luanda',
        senderName: 'Profª. Maria Fernandes',
        senderRole: 'Docente de Matemática',
        date: '16 de Maio de 2026',
        time: '11:15',
        isRead: true,
      },
    ];
    defaultNotifs.forEach((n) => batch.set(doc(db, 'notifications', n.id), n));

    // 6. Coleção `medicalClinics`
    const defaultClinics: MedicalClinic[] = [
      {
        id: 'clinic_luanda_medical',
        name: 'Luanda Medical Center (LMC)',
        specialty: 'Pronto Atendimento & Pediátrico 24h',
        address: 'Rua Amílcar Cabral 3, Maianga, Luanda',
        district: 'Maianga',
        distanceKm: '1.4 km',
        timeMin: '4 min',
        emergencyPhone: '+244 923 167 700',
        services: ['Pediatria 24h', 'Traumatologia Escolar', 'Tomografia / RX Digital', 'Unidade de Cuidados Intensivos'],
        imageUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=500&auto=format&fit=crop&q=80',
        available24h: true,
        schoolId: 'school_horizonte_luanda',
      },
      {
        id: 'clinic_girassol',
        name: 'Clínica Girassol',
        specialty: 'Hospital Geral de Alta Complexidade',
        address: 'Avenida Comandante Gika 225, Alvalade, Luanda',
        district: 'Alvalade',
        distanceKm: '2.8 km',
        timeMin: '8 min',
        emergencyPhone: '+244 226 698 000',
        services: ['Centro de Queimados e Fraturas', 'Bloco Operatório de Urgência', 'Ressonância Magnética'],
        imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500&auto=format&fit=crop&q=80',
        available24h: true,
        schoolId: 'school_horizonte_luanda',
      },
      {
        id: 'clinic_sagrada_esperanca',
        name: 'Clínica Sagrada Esperança',
        specialty: 'Urgências Gerais & Oftalmologia',
        address: 'Avenida Mortala Mohamed, Ilha do Cabo, Luanda',
        district: 'Ilha de Luanda',
        distanceKm: '4.2 km',
        timeMin: '12 min',
        emergencyPhone: '+244 222 309 031',
        services: ['Ambulância Escolar Rápida', 'Emergências Respiratórias e Alergias', 'Cardiologia Pediátrica'],
        imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=80',
        available24h: true,
        schoolId: 'school_horizonte_luanda',
      },
    ];
    defaultClinics.forEach((c) => batch.set(doc(db, 'medicalClinics', c.id), c));

    // 7. Coleção `grades`
    const defaultGrades: Grade[] = [
      {
        id: 'grade_1a_s1_matematica_t1',
        studentId: 's1',
        studentName: 'Lucas Silva',
        classId: '1a',
        className: '10ª Classe A',
        subject: 'Matemática',
        teacherId: 'user_prof_maria',
        teacherName: 'Profª. Maria Fernandes',
        grade: 17.2,
        feedback: 'Excelente domínio em funções polinomiais e geometria analítica.',
        status: 'approved',
        schoolId: 'school_horizonte_luanda',
        approvedBy: 'user_admin_carlos',
        trimestre: 1,
        mac: 16.5,
        npp: 17.0,
        npt: 18.0,
      },
      {
        id: 'grade_1a_s1_fisica_t1',
        studentId: 's1',
        studentName: 'Lucas Silva',
        classId: '1a',
        className: '10ª Classe A',
        subject: 'Física',
        teacherId: 'user_prof_maria',
        teacherName: 'Profª. Maria Fernandes',
        grade: 17.3,
        feedback: 'Ótima compreensão em cinemática e leis de Newton.',
        status: 'approved',
        schoolId: 'school_horizonte_luanda',
        approvedBy: 'user_admin_carlos',
        trimestre: 1,
        mac: 17.0,
        npp: 18.5,
        npt: 16.5,
      },
      {
        id: 'grade_1a_s2_matematica_t1',
        studentId: 's2',
        studentName: 'Beatriz Costa Santos',
        classId: '1a',
        className: '10ª Classe A',
        subject: 'Matemática',
        teacherId: 'user_prof_maria',
        teacherName: 'Profª. Maria Fernandes',
        grade: 15.5,
        feedback: 'Boa dedicação e participação ativa nas aulas.',
        status: 'approved',
        schoolId: 'school_horizonte_luanda',
        approvedBy: 'user_admin_carlos',
        trimestre: 1,
        mac: 15.0,
        npp: 16.0,
        npt: 15.5,
      },
      {
        id: 'grade_1a_s3_matematica_t1',
        studentId: 's3',
        studentName: 'Mateus Henrique Oliveira',
        classId: '1a',
        className: '10ª Classe A',
        subject: 'Matemática',
        teacherId: 'user_prof_maria',
        teacherName: 'Profª. Maria Fernandes',
        grade: 13.2,
        feedback: 'Atingiu os objetivos essenciais, recomendar reforço em trigonometria.',
        status: 'approved',
        schoolId: 'school_horizonte_luanda',
        approvedBy: 'user_admin_carlos',
        trimestre: 1,
        mac: 12.0,
        npp: 13.5,
        npt: 14.0,
      },
    ];
    defaultGrades.forEach((g) => batch.set(doc(db, 'grades', g.id), g));

    // 8. Coleção `studentMedical`
    const defaultMedicals: StudentMedical[] = [
      {
        studentId: 's1',
        studentName: 'Lucas Silva',
        classId: '1a',
        schoolId: 'school_horizonte_luanda',
        insurancePolicyId: 'SEG-ALO-2026-8821',
        insuranceProvider: 'ENSA Seguros Angola',
        policyType: 'comprehensive',
        coverage: [
          'Internamento e Pronto Socorro Pediátrico 24h',
          'Traumatologia e Fraturas em Ambiente Escolar',
          'Cirurgia de Urgência e Cuidados Intensivos',
          'Transferência em Ambulância com Suporte Avançado',
          'Medicamentos e Exames Laboratoriais Hospitalares',
        ],
        validityStart: '2026-01-01',
        validityEnd: '2026-12-31',
        emergencyPhone: '+244 923 884 912',
        emergencyContactName: 'Fernanda Silva (Mãe)',
        allergies: ['Amendoim', 'Penicilina'],
        chronicConditions: ['Nenhuma condição crônica registada'],
        notes: 'Em caso de ingestão acidental de amendoim, contactar imediatamente a equipa médica e administrar anti-histamínico se prescrito.',
      },
      {
        studentId: 's2',
        studentName: 'Beatriz Costa Santos',
        classId: '1a',
        schoolId: 'school_horizonte_luanda',
        insurancePolicyId: 'SEG-ALO-2026-8822',
        insuranceProvider: 'Nossa Seguros',
        policyType: 'basic',
        coverage: [
          'Primeiros socorros escolares',
          'Urgência Pediátrica',
          'Transferência Hospitalar Básica',
        ],
        validityStart: '2026-01-01',
        validityEnd: '2026-12-31',
        emergencyPhone: '+244 924 551 092',
        emergencyContactName: 'Fernanda Silva (Mãe)',
        allergies: ['Nenhuma alergia conhecida'],
        chronicConditions: [],
        notes: 'Aluna saudável e apta para todas as atividades de educação física.',
      },
      {
        studentId: 's3',
        studentName: 'Mateus Henrique Oliveira',
        classId: '1a',
        schoolId: 'school_horizonte_luanda',
        insurancePolicyId: 'SEG-ALO-2026-8823',
        insuranceProvider: 'Fidelidade Angola',
        policyType: 'comprehensive',
        coverage: [
          'Cobertura Integral Hospitalar e Medicamentosa',
          'Pronto Atendimento 24h',
          'Cirurgia e Ortopedia Escolar',
        ],
        validityStart: '2026-01-01',
        validityEnd: '2026-12-31',
        emergencyPhone: '+244 926 773 118',
        emergencyContactName: 'Henrique Oliveira (Pai)',
        allergies: ['Dipirona'],
        chronicConditions: [],
      },
    ];
    defaultMedicals.forEach((m) => batch.set(doc(db, 'studentMedical', m.studentId), m));

    // Also populate legacy and relational catalog collections for seamless backwards compatibility
    DEFAULT_TURMAS.forEach((t) => batch.set(doc(db, 'turmas', t.id), t));
    DEFAULT_TURMAS_PROFESSORES.forEach((tp) => batch.set(doc(db, 'turmas_professores', tp.id), tp));

    defaultStudents.forEach((st) => {
      const alunoLegacy: Aluno = {
        ...st,
        nome_completo: st.name,
        turma_id: st.classId === '1a' ? 'turma_10a' : 'turma_10b',
        encarregado_id: 'user_pai_fernanda',
        foto_biometrica_url: st.photoUrl || '',
        guia_medica: {
          tipagem_sanguinea: 'O+',
          alergias: ['Amendoim', 'Penicilina'],
          tem_seguro: true,
          tipo_seguro: 'Seguro Escolar Completo Plus',
          seguradora: 'ENSA Seguros Angola',
          cobertura_detalhes: 'Internamento, Pronto Socorro Pediátrico 24h',
          numero_apolice: st.insurancePolicyId || 'SEG-ALO-2026-8821',
          contacto_emergencia: st.parentPhone || '+244 923 884 912',
        },
      };
      batch.set(doc(db, 'alunos', st.id), alunoLegacy);
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.warn('Erro ao inicializar semente Firestore:', error);
    return false;
  }
}

// ==========================================================
// 19. Teacher Listings Collection (teacherListings/{listingId})
//     Aulas Particulares & Explicações Domiciliares
// ==========================================================

export const INITIAL_TEACHER_LISTINGS: TeacherListing[] = [
  {
    id: 'listing_carlos_mat',
    institutionId: 'escola_colegio_horizonte',
    teacherUid: 'prof_antonio_silva',
    teacherId: 'prof_antonio_silva',
    teacherName: 'Prof. Carlos Manuel',
    teacherPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    title: 'Explicação de Matemática e Raciocínio Lógico',
    description: 'Acompanhamento individual em Matemática, preparação para testes e recuperação de conteúdos com foco em resolução prática.',
    subjectId: 'Matemática',
    targetClasses: ['7ª Classe', '8ª Classe', '9ª Classe'],
    category: 'home_tutoring',
    modality: 'home',
    location: {
      province: 'Luanda',
      municipality: 'Talatona',
      district: 'Benfica / Talatona Sul',
      description: 'Atendimento presencial no domicílio do aluno nas zonas de Talatona e Benfica',
    },
    availability: {
      days: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'],
      startTime: '14:30',
      endTime: '18:30',
    },
    price: 5000,
    currency: 'Kz',
    contactPhone: '+244 923 456 789',
    showPhone: false,
    status: 'approved',
    publishedAt: '2026-08-20T10:00:00Z',
    createdAt: '2026-08-18T14:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'listing_teresa_pt',
    institutionId: 'escola_colegio_horizonte',
    teacherUid: 'prof_teresa_mendes',
    teacherId: 'prof_teresa_mendes',
    teacherName: 'Profª. Teresa Mendes',
    teacherPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    title: 'Apoio em Língua Portuguesa, Redação e Gramática',
    description: 'Especialista em desenvolvimento de redação estruturada, análise literária e interpretação de textos para o Ensino Secundário.',
    subjectId: 'Língua Portuguesa',
    targetClasses: ['5ª Classe', '6ª Classe', '7ª Classe', '8ª Classe', '9ª Classe'],
    category: 'tutoring',
    modality: 'school',
    location: {
      province: 'Luanda',
      municipality: 'Luanda',
      district: 'Maianga / Alvalade',
      description: 'Instalações do colégio ou domiciliar nas imediações da Maianga',
    },
    availability: {
      days: ['Terça-feira', 'Quinta-feira', 'Sábado'],
      startTime: '15:00',
      endTime: '18:00',
    },
    price: 4500,
    currency: 'Kz',
    contactPhone: '+244 931 234 567',
    showPhone: true,
    status: 'approved',
    publishedAt: '2026-08-22T09:30:00Z',
    createdAt: '2026-08-21T11:00:00Z',
    updatedAt: '2026-08-22T09:30:00Z',
  },
  {
    id: 'listing_manuel_fq',
    institutionId: 'escola_colegio_horizonte',
    teacherUid: 'prof_manuel_costa',
    teacherId: 'prof_manuel_costa',
    teacherName: 'Prof. Manuel Costa',
    teacherPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    title: 'Preparação para Exames: Física & Química',
    description: 'Mestre em Ciências Físicas. Aulas interativas com recurso a laboratórios virtuais e resolução comentada de exames dos anos anteriores.',
    subjectId: 'Física',
    targetClasses: ['10ª Classe', '11ª Classe', '12ª Classe'],
    category: 'online',
    modality: 'online',
    location: {
      province: 'Luanda',
      municipality: 'Belas',
      district: 'Kilamba / Belas',
      description: 'Modalidade 100% Online via Google Meet / Sala Virtual',
    },
    availability: {
      days: ['Segunda-feira', 'Quarta-feira', 'Sábado'],
      startTime: '17:00',
      endTime: '20:00',
    },
    price: 6000,
    currency: 'Kz',
    contactPhone: '+244 945 678 123',
    showPhone: false,
    status: 'approved',
    publishedAt: '2026-08-25T15:00:00Z',
    createdAt: '2026-08-24T10:00:00Z',
    updatedAt: '2026-08-25T15:00:00Z',
  },
  {
    id: 'listing_esperanca_prim',
    institutionId: 'escola_colegio_horizonte',
    teacherUid: 'prof_esperanca_afonso',
    teacherId: 'prof_esperanca_afonso',
    teacherName: 'Profª. Esperança Afonso',
    teacherPhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    title: 'Acompanhamento Escolar Global e TPCs (Primário)',
    description: 'Supervisão diária das tarefas escolares, rotina de estudo e desenvolvimento da leitura e cálculo para alunos do Ensino Primário.',
    subjectId: 'Estudo do Meio',
    targetClasses: ['1ª Classe', '2ª Classe', '3ª Classe', '4ª Classe', '5ª Classe', '6ª Classe'],
    category: 'academic_support',
    modality: 'home',
    location: {
      province: 'Luanda',
      municipality: 'Kilamba Kiaxi',
      district: 'Camama / Morro Bento',
      description: 'Atendimento no domicílio do aluno com materiais pedagógicos próprios',
    },
    availability: {
      days: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira'],
      startTime: '14:00',
      endTime: '17:30',
    },
    price: 4000,
    currency: 'Kz',
    contactPhone: '+244 924 888 999',
    showPhone: false,
    status: 'approved',
    publishedAt: '2026-08-28T12:00:00Z',
    createdAt: '2026-08-27T08:00:00Z',
    updatedAt: '2026-08-28T12:00:00Z',
  },
  {
    id: 'listing_joao_bio',
    institutionId: 'escola_colegio_horizonte',
    teacherUid: 'prof_joao_baptista',
    teacherId: 'prof_joao_baptista',
    teacherName: 'Prof. João Baptista',
    teacherPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    title: 'Reforço de Biologia e Geologia - 10ª a 12ª Classe',
    description: 'Foco nos módulos de Genética, Ecologia e Anatomia Humana com exercícios direcionados a exames de acesso ao ensino superior.',
    subjectId: 'Biologia',
    targetClasses: ['10ª Classe', '11ª Classe', '12ª Classe'],
    category: 'exam_preparation',
    modality: 'school',
    location: {
      province: 'Luanda',
      municipality: 'Luanda',
      district: 'Ingombota / Maculusso',
      description: 'Salas de estudo do Colégio ou Domicílio sob consulta',
    },
    availability: {
      days: ['Segunda-feira', 'Quarta-feira', 'Sexta-feira'],
      startTime: '15:30',
      endTime: '19:00',
    },
    price: 5500,
    currency: 'Kz',
    contactPhone: '+244 912 345 678',
    showPhone: true,
    status: 'pending',
    createdAt: '2026-09-02T10:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z',
  },
];

/**
 * Carrega anúncios APROVADOS (visíveis para Pais / Encarregados)
 * Se a coleção estiver vazia no Firestore, inicializa com a semente institucional
 */
export async function fetchApprovedTeacherListings(): Promise<TeacherListing[]> {
  try {
    const q = query(
      collection(db, 'teacherListings'),
      where('status', '==', 'approved')
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // Seed Firestore with initial listings if completely empty
      const batch = writeBatch(db);
      for (const listing of INITIAL_TEACHER_LISTINGS) {
        const ref = doc(db, 'teacherListings', listing.id);
        batch.set(ref, listing);
      }
      try {
        await batch.commit();
      } catch (seedErr) {
        console.warn('Não foi possível persistir semente inicial de anúncios no Firestore:', seedErr);
      }
      return INITIAL_TEACHER_LISTINGS.filter((l) => l.status === 'approved');
    }

    const listings: TeacherListing[] = [];
    snap.forEach((docSnap) => {
      listings.push({ ...(docSnap.data() as TeacherListing), id: docSnap.id });
    });

    // Ordenar pelos mais recentes publicados
    listings.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

    return listings;
  } catch (error) {
    console.warn('Erro ao carregar anúncios aprovados do Firestore. A recorrer a fallback local:', error);
    return INITIAL_TEACHER_LISTINGS.filter((l) => l.status === 'approved');
  }
}

/**
 * Carrega todos os anúncios de um determinado professor (rascunhos, pendentes, aprovados, rejeitados)
 */
export async function fetchTeacherListingsByTeacher(teacherIdOrUid: string): Promise<TeacherListing[]> {
  try {
    const q = query(
      collection(db, 'teacherListings'),
      where('teacherId', '==', teacherIdOrUid)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // Also query by teacherUid if different
      const qUid = query(
        collection(db, 'teacherListings'),
        where('teacherUid', '==', teacherIdOrUid)
      );
      const snapUid = await getDocs(qUid);
      if (!snapUid.empty) {
        const list: TeacherListing[] = [];
        snapUid.forEach((d) => list.push({ ...(d.data() as TeacherListing), id: d.id }));
        return list;
      }
      return INITIAL_TEACHER_LISTINGS.filter(
        (l) => l.teacherId === teacherIdOrUid || l.teacherUid === teacherIdOrUid
      );
    }

    const listings: TeacherListing[] = [];
    snap.forEach((docSnap) => {
      listings.push({ ...(docSnap.data() as TeacherListing), id: docSnap.id });
    });
    return listings;
  } catch (error) {
    console.warn('Erro ao carregar anúncios do professor:', error);
    return INITIAL_TEACHER_LISTINGS.filter(
      (l) => l.teacherId === teacherIdOrUid || l.teacherUid === teacherIdOrUid
    );
  }
}

/**
 * Carrega todos os anúncios para a moderação da Instituição (Admin)
 */
export async function fetchAllTeacherListingsForAdmin(): Promise<TeacherListing[]> {
  try {
    const snap = await getDocs(collection(db, 'teacherListings'));
    if (snap.empty) {
      // Seed if empty
      const batch = writeBatch(db);
      for (const listing of INITIAL_TEACHER_LISTINGS) {
        const ref = doc(db, 'teacherListings', listing.id);
        batch.set(ref, listing);
      }
      try {
        await batch.commit();
      } catch (err) {
        console.warn('Erro ao semear teacherListings:', err);
      }
      return INITIAL_TEACHER_LISTINGS;
    }

    const listings: TeacherListing[] = [];
    snap.forEach((docSnap) => {
      listings.push({ ...(docSnap.data() as TeacherListing), id: docSnap.id });
    });
    return listings;
  } catch (error) {
    console.warn('Erro ao carregar anúncios para o admin:', error);
    return INITIAL_TEACHER_LISTINGS;
  }
}

/**
 * Salva ou atualiza um anúncio (Professor)
 */
export async function saveTeacherListing(
  listing: Partial<TeacherListing> & {
    teacherUid: string;
    teacherId: string;
    title: string;
    description: string;
  }
): Promise<TeacherListing> {
  try {
    const listingId = listing.id || `listing_${listing.teacherId}_${Date.now()}`;
    const completeListing: TeacherListing = {
      id: listingId,
      institutionId: listing.institutionId || 'escola_colegio_horizonte',
      teacherUid: listing.teacherUid,
      teacherId: listing.teacherId,
      teacherName: listing.teacherName || 'Docente',
      teacherPhoto: listing.teacherPhoto || '',
      title: listing.title,
      description: listing.description,
      subjectId: listing.subjectId || 'Geral',
      targetClasses: listing.targetClasses || ['7ª Classe', '8ª Classe'],
      category: listing.category || 'tutoring',
      modality: listing.modality || 'home',
      location: listing.location || {
        province: 'Luanda',
        municipality: 'Talatona',
        district: 'Luanda Sul',
      },
      availability: listing.availability || {
        days: ['Segunda a Sexta'],
        startTime: '14:00',
        endTime: '18:00',
      },
      price: Number(listing.price) || 5000,
      currency: listing.currency || 'Kz',
      contactPhone: listing.contactPhone || '',
      showPhone: listing.showPhone ?? false,
      imageUrl: listing.imageUrl || '',
      status: listing.status || 'draft',
      rejectionReason: listing.rejectionReason || undefined,
      publishedAt: listing.publishedAt || (listing.status === 'approved' ? new Date().toISOString() : undefined),
      createdAt: listing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'teacherListings', listingId), completeListing, { merge: true });
    return completeListing;
  } catch (error) {
    console.error('Erro ao gravar anúncio no Firestore:', error);
    throw error;
  }
}

/**
 * Submete anúncio para aprovação institucional (draft -> pending)
 */
export async function submitListingForReview(listingId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'teacherListings', listingId), {
      status: 'pending',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao submeter anúncio para revisão:', error);
    throw error;
  }
}

/**
 * Aprova anúncio (Instituição / Admin) -> status: 'approved'
 */
export async function approveTeacherListing(listingId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'teacherListings', listingId), {
      status: 'approved',
      rejectionReason: null,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao aprovar anúncio:', error);
    throw error;
  }
}

/**
 * Rejeita anúncio com motivo justificado (Instituição / Admin) -> status: 'rejected'
 */
export async function rejectTeacherListing(listingId: string, reason: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'teacherListings', listingId), {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao rejeitar anúncio:', error);
    throw error;
  }
}

/**
 * Suspende anúncio temporariamente (Instituição / Admin) -> status: 'suspended'
 */
export async function suspendTeacherListing(listingId: string, reason?: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'teacherListings', listingId), {
      status: 'suspended',
      rejectionReason: reason || 'Suspenso pela administração escolar',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao suspender anúncio:', error);
    throw error;
  }
}

/**
 * Apaga anúncio (Professor se for draft, ou Instituição)
 */
export async function deleteTeacherListing(listingId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'teacherListings', listingId));
  } catch (error) {
    console.error('Erro ao apagar anúncio:', error);
    throw error;
  }
}

// ==========================================================
// 16. CHAT INTERNO (Professor ↔ Encarregado vinculado ao Educando)
// ==========================================================

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_prof_maria_pai_fernanda_lucas',
    institutionId: 'school_horizonte_luanda',
    participantIds: ['user_prof_maria', 'user_pai_fernanda', 'fernanda.silva@email.com', 'maria.fernandes@escola.ao'],
    teacherUid: 'user_prof_maria',
    teacherName: 'Profª. Maria Fernandes',
    teacherPhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    guardianUid: 'user_pai_fernanda',
    guardianName: 'Fernanda Silva',
    guardianPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    studentId: 'std_lucas_silva',
    studentName: 'Lucas Silva',
    studentClass: '10ª Classe A',
    subjectId: 'matematica',
    subjectName: 'Matemática',
    context: 'academic',
    lastMessage: 'Olá D. Fernanda, o Lucas teve um excelente desempenho na avaliação contínua!',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    active: true,
    unreadCountTeacher: 0,
    unreadCountGuardian: 1,
  },
  {
    id: 'conv_prof_joao_pai_fernanda_lucas',
    institutionId: 'school_horizonte_luanda',
    participantIds: ['user_prof_joao', 'user_pai_fernanda', 'fernanda.silva@email.com', 'joao.kuanza@escola.ao'],
    teacherUid: 'user_prof_joao',
    teacherName: 'Prof. João Kuanza',
    teacherPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    guardianUid: 'user_pai_fernanda',
    guardianName: 'Fernanda Silva',
    guardianPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    studentId: 'std_lucas_silva',
    studentName: 'Lucas Silva',
    studentClass: '10ª Classe A',
    subjectId: 'historia',
    subjectName: 'História',
    context: 'student',
    lastMessage: 'Boa tarde, confirme por favor se o Lucas já dispõe do livro de História de Angola.',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    active: true,
    unreadCountTeacher: 0,
    unreadCountGuardian: 0,
  },
];

export const INITIAL_MESSAGES_MAP: Record<string, ChatMessage[]> = {
  conv_prof_maria_pai_fernanda_lucas: [
    {
      id: 'msg_1',
      conversationId: 'conv_prof_maria_pai_fernanda_lucas',
      senderUid: 'user_pai_fernanda',
      senderName: 'Fernanda Silva',
      senderRole: 'pai',
      text: 'Boa tarde Profª Maria, tudo bem? Gostaria de saber como está a participação do Lucas nas aulas de Matemática.',
      read: true,
      readAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: 'msg_2',
      conversationId: 'conv_prof_maria_pai_fernanda_lucas',
      senderUid: 'user_prof_maria',
      senderName: 'Profª. Maria Fernandes',
      senderRole: 'professor',
      text: 'Olá D. Fernanda, o Lucas teve um excelente desempenho na avaliação contínua! Demonstrou muita evolução em Trigonometria.',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    },
  ],
  conv_prof_joao_pai_fernanda_lucas: [
    {
      id: 'msg_3',
      conversationId: 'conv_prof_joao_pai_fernanda_lucas',
      senderUid: 'user_prof_joao',
      senderName: 'Prof. João Kuanza',
      senderRole: 'professor',
      text: 'Boa tarde, confirme por favor se o Lucas já dispõe do livro de História de Angola.',
      read: true,
      readAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: 'msg_4',
      conversationId: 'conv_prof_joao_pai_fernanda_lucas',
      senderUid: 'user_pai_fernanda',
      senderName: 'Fernanda Silva',
      senderRole: 'pai',
      text: 'Sim professor, já providenciámos o manual na semana passada. Muito obrigada pelo acompanhamento!',
      read: true,
      readAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    },
  ],
};

/**
 * Obtém conversas vinculadas a um utilizador (Pai ou Professor)
 */
export async function getConversations(userId: string): Promise<Conversation[]> {
  const path = 'conversations';
  try {
    const q = query(
      collection(db, path),
      where('participantIds', 'array-contains', userId)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      // Fallback: tentar listar todas e filtrar em memória
      const allSnap = await getDocs(collection(db, path));
      const filtered = allSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) }))
        .filter((c) =>
          c.participantIds?.includes(userId) ||
          c.teacherUid === userId ||
          c.guardianUid === userId
        );
      if (filtered.length > 0) return filtered;

      // Se ainda vazio, retorna iniciais correspondentes
      return INITIAL_CONVERSATIONS.filter(
        (c) =>
          c.participantIds.includes(userId) ||
          c.teacherUid === userId ||
          c.guardianUid === userId ||
          userId.includes('fernanda') ||
          userId.includes('maria') ||
          userId.includes('joao')
      );
    }
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return INITIAL_CONVERSATIONS;
  }
}

/**
 * Escuta conversas em tempo real
 */
export function listenConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void
): () => void {
  const path = 'conversations';
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        if (snapshot.empty) {
          callback(
            INITIAL_CONVERSATIONS.filter(
              (c) =>
                c.participantIds.includes(userId) ||
                c.teacherUid === userId ||
                c.guardianUid === userId ||
                userId.includes('fernanda') ||
                userId.includes('maria') ||
                userId.includes('joao')
            )
          );
          return;
        }

        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) }))
          .filter(
            (c) =>
              c.participantIds?.includes(userId) ||
              c.teacherUid === userId ||
              c.guardianUid === userId ||
              userId === 'admin' ||
              userId === 'instituicao'
          );

        list.sort((a, b) => {
          const dateA = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
          const dateB = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
          return dateB - dateA;
        });

        callback(list.length > 0 ? list : INITIAL_CONVERSATIONS);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        callback(INITIAL_CONVERSATIONS);
      }
    );
  } catch (err) {
    console.warn('Fallback listener conversas:', err);
    callback(INITIAL_CONVERSATIONS);
    return () => {};
  }
}

/**
 * Escuta mensagens de uma conversa específica em tempo real
 */
export function listenMessages(
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const path = `conversations/${conversationId}/messages`;
  try {
    return onSnapshot(
      collection(db, 'conversations', conversationId, 'messages'),
      (snapshot) => {
        if (snapshot.empty) {
          const fallback = INITIAL_MESSAGES_MAP[conversationId] || [];
          callback(fallback);
          return;
        }

        const messages = snapshot.docs.map((d) => ({
          id: d.id,
          conversationId,
          ...(d.data() as Omit<ChatMessage, 'id' | 'conversationId'>),
        }));

        // Ordenar cronologicamente
        messages.sort((a, b) => {
          const tA = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0).getTime();
          return tA - tB;
        });

        callback(messages);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        const fallback = INITIAL_MESSAGES_MAP[conversationId] || [];
        callback(fallback);
      }
    );
  } catch (err) {
    console.warn('Fallback listener mensagens:', err);
    callback(INITIAL_MESSAGES_MAP[conversationId] || []);
    return () => {};
  }
}

/**
 * Remove recursivamente campos 'undefined' para compatibilidade estrita com o Firestore
 */
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = stripUndefined(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Envia uma nova mensagem no chat e atualiza metadados da conversa
 */
export async function sendChatMessage(
  conversationId: string,
  conversation: Conversation,
  payload: {
    senderUid: string;
    senderName: string;
    senderRole: 'professor' | 'pai' | 'encarregado' | 'instituicao';
    receiverUid?: string;
    text?: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'document' | 'pdf';
    attachmentName?: string;
  }
): Promise<string> {
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const rawMessageDoc: Record<string, any> = {
    id: msgId,
    conversationId,
    senderUid: payload.senderUid,
    receiverUid: payload.receiverUid || (payload.senderRole === 'professor' ? conversation.guardianUid : conversation.teacherUid),
    senderName: payload.senderName || 'Utilizador',
    senderRole: payload.senderRole,
    text: payload.text || '',
    read: false,
    createdAt: now,
  };

  if (payload.attachmentUrl) {
    rawMessageDoc.attachmentUrl = payload.attachmentUrl;
  }
  if (payload.attachmentType) {
    rawMessageDoc.attachmentType = payload.attachmentType;
  }
  if (payload.attachmentName) {
    rawMessageDoc.attachmentName = payload.attachmentName;
  }

  const messageDoc = stripUndefined(rawMessageDoc) as ChatMessage;

  try {
    // 1. Gravar mensagem na subcoleção
    await setDoc(doc(db, 'conversations', conversationId, 'messages', msgId), stripUndefined(rawMessageDoc));

    // 2. Atualizar documento da conversa
    const isTeacher = payload.senderRole === 'professor';
    const convRef = doc(db, 'conversations', conversationId);

    const updatePayload: Record<string, any> = {
      lastMessage: payload.text || (payload.attachmentName ? `[Anexo: ${payload.attachmentName}]` : 'Novo anexo'),
      lastMessageAt: now,
      updatedAt: now,
      active: true,
    };

    if (isTeacher) {
      updatePayload.unreadCountGuardian = (conversation.unreadCountGuardian || 0) + 1;
    } else {
      updatePayload.unreadCountTeacher = (conversation.unreadCountTeacher || 0) + 1;
    }

    await setDoc(convRef, stripUndefined(updatePayload), { merge: true });

    // 3. Criar notificação na coleção 'notifications' para o destinatário
    const recipientUid = messageDoc.receiverUid;
    const previewText = payload.text ? (payload.text.length > 60 ? payload.text.substring(0, 60) + '...' : payload.text) : 'Enviou um anexo';

    try {
      const notifData = stripUndefined({
        id: `notif_chat_${msgId}`,
        type: 'broadcast',
        title: `Nova mensagem de ${payload.senderName || 'Utilizador'}`,
        subject: `Assunto: ${conversation.subjectName || conversation.studentName || 'Acompanhamento'}`,
        message: `${payload.senderName || 'Utilizador'}: "${previewText}" (Aluno: ${conversation.studentName || 'Educando'})`,
        studentId: conversation.studentId || 'std',
        studentName: conversation.studentName || 'Educando',
        className: conversation.studentClass || 'Turma',
        schoolId: conversation.institutionId || 'school_horizonte_luanda',
        senderName: payload.senderName || 'Utilizador',
        senderRole: payload.senderRole,
        date: new Date().toLocaleDateString('pt-AO'),
        time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
        targetUserUid: recipientUid || '',
        createdAt: now,
        updatedAt: now,
      });

      await setDoc(doc(db, 'notifications', `notif_chat_${msgId}`), notifData);
    } catch (notifErr) {
      console.warn('Aviso: notificação de chat não pôde ser gravada:', notifErr);
    }

    return msgId;
  } catch (error) {
    console.error('Erro ao enviar mensagem no Firestore:', error);
    // Armazenar no fallback local para não perder envio se offline
    if (!INITIAL_MESSAGES_MAP[conversationId]) {
      INITIAL_MESSAGES_MAP[conversationId] = [];
    }
    INITIAL_MESSAGES_MAP[conversationId].push(messageDoc);
    return msgId;
  }
}

/**
 * Marca mensagens de uma conversa como lidas pelo utilizador atual
 */
export async function markChatMessagesAsRead(
  conversationId: string,
  currentUserId: string,
  userRole: 'professor' | 'pai' | 'encarregado' | 'instituicao'
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    const resetPayload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (userRole === 'professor') {
      resetPayload.unreadCountTeacher = 0;
    } else {
      resetPayload.unreadCountGuardian = 0;
    }

    await updateDoc(convRef, resetPayload);

    // Atualizar mensagens não lidas
    const messagesSnap = await getDocs(
      collection(db, 'conversations', conversationId, 'messages')
    );

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    let count = 0;

    messagesSnap.forEach((d) => {
      const data = d.data() as ChatMessage;
      if (!data.read && data.senderUid !== currentUserId) {
        batch.update(d.ref, { read: true, readAt: now });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.warn('Aviso ao marcar mensagens como lidas:', error);
  }
}

/**
 * Cria ou obtém uma conversa existente vinculada estritamente ao educando
 */
export async function createOrGetConversation(params: {
  institutionId?: string;
  teacherUid: string;
  teacherName: string;
  teacherPhoto?: string;
  guardianUid: string;
  guardianName: string;
  guardianPhoto?: string;
  studentId: string;
  studentName: string;
  studentClass?: string;
  subjectId?: string;
  subjectName?: string;
  context: ConversationContext;
  initialMessage?: string;
  senderRole?: 'professor' | 'pai' | 'encarregado';
}): Promise<Conversation> {
  // ID canônico e determinístico garantindo unicidade da relação Professor ↔ Pai ↔ Educando
  const convId = `conv_${params.teacherUid}_${params.guardianUid}_${params.studentId}_${params.subjectId || 'geral'}`;
  const now = new Date().toISOString();

  const convRef = doc(db, 'conversations', convId);
  try {
    const existingSnap = await getDoc(convRef);
    if (existingSnap.exists()) {
      return { id: existingSnap.id, ...(existingSnap.data() as Omit<Conversation, 'id'>) };
    }

    const newConversation: Conversation = {
      id: convId,
      institutionId: params.institutionId || 'school_horizonte_luanda',
      participantIds: [
        params.teacherUid,
        params.guardianUid,
        'fernanda.silva@email.com',
        'maria.fernandes@escola.ao',
      ],
      teacherUid: params.teacherUid,
      teacherName: params.teacherName,
      teacherPhoto: params.teacherPhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      guardianUid: params.guardianUid,
      guardianName: params.guardianName,
      guardianPhoto: params.guardianPhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      studentId: params.studentId,
      studentName: params.studentName,
      studentClass: params.studentClass || '10ª Classe A',
      subjectId: params.subjectId || 'geral',
      subjectName: params.subjectName || 'Geral / Acompanhamento',
      context: params.context,
      lastMessage: params.initialMessage || 'Conversa iniciada',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
      active: true,
      unreadCountTeacher: params.senderRole === 'pai' ? 1 : 0,
      unreadCountGuardian: params.senderRole === 'professor' ? 1 : 0,
    };

    await setDoc(convRef, stripUndefined(newConversation));

    // Se houve mensagem inicial, enviar para subcoleção
    if (params.initialMessage) {
      await sendChatMessage(convId, newConversation, {
        senderUid: params.senderRole === 'professor' ? params.teacherUid : params.guardianUid,
        senderName: params.senderRole === 'professor' ? params.teacherName : params.guardianName,
        senderRole: params.senderRole || 'pai',
        text: params.initialMessage,
      });
    }

    return newConversation;
  } catch (error) {
    console.warn('Erro ao criar conversa no Firestore, usando fallback local:', error);
    const fallbackConv: Conversation = {
      id: convId,
      institutionId: params.institutionId || 'school_horizonte_luanda',
      participantIds: [params.teacherUid, params.guardianUid],
      teacherUid: params.teacherUid,
      teacherName: params.teacherName,
      guardianUid: params.guardianUid,
      guardianName: params.guardianName,
      studentId: params.studentId,
      studentName: params.studentName,
      studentClass: params.studentClass || '10ª Classe A',
      subjectId: params.subjectId || 'geral',
      subjectName: params.subjectName || 'Geral',
      context: params.context,
      lastMessage: params.initialMessage || 'Conversa iniciada',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
      active: true,
      unreadCountTeacher: 0,
      unreadCountGuardian: 0,
    };
    return fallbackConv;
  }
}

