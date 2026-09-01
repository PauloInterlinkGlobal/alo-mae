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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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

export async function getTurmas(instituicaoId?: string): Promise<Turma[]> {
  const path = 'turmas';
  try {
    const q = instituicaoId
      ? query(collection(db, path), where('instituicao_id', '==', instituicaoId))
      : query(collection(db, path));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Turma, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getTurmasProfessores(professorId?: string): Promise<TurmaProfessor[]> {
  const path = 'turmas_professores';
  try {
    const q = professorId
      ? query(collection(db, path), where('professor_id', '==', professorId))
      : query(collection(db, path));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TurmaProfessor, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
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
        classId: pauta.turma_id,
        className: pauta.turma_nome || '10ª Classe A',
        subject: pauta.disciplina,
        teacherId: pauta.professor_id,
        teacherName: pauta.professor_nome || 'Professor',
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
    type: presenca.type === 'exit' || presenca.tipo === 'saida' ? 'exit' : 'entry',
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

    // Also populate legacy collections for seamless backwards compatibility
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
          numero_apolice: st.insurancePolicyId,
          contacto_emergencia: st.parentPhone,
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
