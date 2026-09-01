import * as admin from 'firebase-admin';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { CustomClaims } from './types';

const auth = admin.auth();
const db = admin.firestore();

/**
 * Função Auxiliar para definir Custom Claims em um utilizador Firebase
 */
export async function setUserCustomClaims(uid: string, claims: CustomClaims): Promise<void> {
  await auth.setCustomUserClaims(uid, claims);
}

/**
 * HTTPS Callable: provisionTeacherClass (FIX #1 & FIX #2)
 * Atribui turmas (classIds) ao docente e atualiza as Custom Claims
 */
export const provisionTeacherClass = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária.');
  }

  const callerToken = request.auth.token;
  if (callerToken.role !== 'instituicao') {
    throw new HttpsError('permission-denied', 'Apenas a instituição escolar pode atribuir turmas a professores.');
  }

  const schoolId = callerToken.schoolId;
  const { teacherUid, classIds } = request.data as {
    teacherUid: string;
    classIds: string[];
  };

  if (!teacherUid || !Array.isArray(classIds)) {
    throw new HttpsError('invalid-argument', 'Parâmetros "teacherUid" e "classIds" (array) são obrigatórios.');
  }

  const teacherRef = db.collection('users').doc(teacherUid);
  const teacherSnap = await teacherRef.get();

  if (!teacherSnap.exists) {
    throw new HttpsError('not-found', `Docente com UID "${teacherUid}" não encontrado.`);
  }

  const teacherData = teacherSnap.data()!;
  if (teacherData.schoolId !== schoolId) {
    throw new HttpsError('permission-denied', 'Não tem permissão para gerir docentes de outra instituição.');
  }

  // 1. Atualizar documento do utilizador no Firestore
  await teacherRef.set({
    classIds,
    assignedClassIds: classIds,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // 2. Atualizar Custom Claims no Firebase Auth
  const currentClaims = (await auth.getUser(teacherUid)).customClaims || {};
  const updatedClaims: CustomClaims = {
    role: 'professor',
    schoolId,
    classIds,
    assignedClassIds: classIds,
    ...currentClaims,
  };

  await auth.setCustomUserClaims(teacherUid, updatedClaims);

  return {
    success: true,
    message: `Turmas associadas com sucesso ao docente (${classIds.length} turmas).`,
    teacherUid,
    classIds
  };
});

/**
 * HTTPS Callable: linkParentToStudent
 * Vincula um pai a um ou mais alunos na base de dados e atualiza as Custom Claims
 */
export const linkParentToStudent = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'O utilizador deve estar autenticado para executar esta operação.');
  }

  const callerToken = request.auth.token;
  const callerRole = callerToken.role;
  const callerSchoolId = callerToken.schoolId;

  const { parentUid, studentId, verificationOtp } = request.data as {
    parentUid: string;
    studentId: string;
    verificationOtp?: string;
  };

  if (!parentUid || !studentId) {
    throw new HttpsError('invalid-argument', 'Parâmetros "parentUid" e "studentId" são obrigatórios.');
  }

  const isSchoolAdmin = callerRole === 'instituicao' && callerSchoolId;

  const studentRef = db.collection('students').doc(studentId);
  const studentSnap = await studentRef.get();

  if (!studentSnap.exists) {
    throw new HttpsError('not-found', `Aluno com ID "${studentId}" não foi encontrado.`);
  }

  const studentData = studentSnap.data()!;
  const studentSchoolId = studentData.schoolId;

  if (isSchoolAdmin && callerSchoolId !== studentSchoolId) {
    throw new HttpsError('permission-denied', 'Não tem permissão para vincular alunos de outra escola.');
  }

  const parentUserRef = db.collection('users').doc(parentUid);
  const parentUserSnap = await parentUserRef.get();

  if (!parentUserSnap.exists) {
    throw new HttpsError('not-found', `Utilizador pai com UID "${parentUid}" não foi encontrado.`);
  }

  const parentUserData = parentUserSnap.data()!;

  if (!isSchoolAdmin) {
    const isSelf = request.auth.uid === parentUid;
    if (!isSelf) {
      throw new HttpsError('permission-denied', 'Apenas a instituição ou o próprio pai autenticado podem vincular o aluno.');
    }

    const emailMatches = studentData.parentEmail && studentData.parentEmail.toLowerCase() === parentUserData.email?.toLowerCase();
    const phoneMatches = studentData.parentPhone && studentData.parentPhone.replace(/\D/g, '') === parentUserData.phone?.replace(/\D/g, '');

    if (!emailMatches && !phoneMatches && !verificationOtp) {
      throw new HttpsError('permission-denied', 'Os dados de contacto do aluno não coincidem com este perfil de encarregado.');
    }
  }

  const existingChildren: string[] = parentUserData.childrenIds || (parentUserData.studentId ? [parentUserData.studentId] : []);
  if (!existingChildren.includes(studentId)) {
    existingChildren.push(studentId);
  }

  await parentUserRef.set({
    childrenIds: existingChildren,
    studentId: existingChildren[0],
    schoolId: studentSchoolId,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  const currentClaims = (await auth.getUser(parentUid)).customClaims || {};
  const updatedClaims: CustomClaims = {
    role: 'pai',
    schoolId: studentSchoolId,
    studentIds: existingChildren,
    studentId: existingChildren[0],
    ...currentClaims,
  };

  await auth.setCustomUserClaims(parentUid, updatedClaims);

  return {
    success: true,
    message: `Aluno "${studentData.name}" vinculado com sucesso ao encarregado.`,
    studentId,
    parentUid,
    childrenIds: existingChildren
  };
});

/**
 * HTTPS Callable: provisionTerminalDevice
 * Permite que administradores escolares gerem tokens de serviço dedicados para dispositivos biométricos
 */
export const provisionTerminalDevice = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Autenticação necessária.');
  }

  const callerToken = request.auth.token;
  if (callerToken.role !== 'instituicao') {
    throw new HttpsError('permission-denied', 'Apenas administradores de instituições podem provisionar terminais biométricos.');
  }

  const schoolId = callerToken.schoolId;
  const { deviceSerial, deviceLocation } = request.data as {
    deviceSerial: string;
    deviceLocation: string;
  };

  if (!deviceSerial) {
    throw new HttpsError('invalid-argument', 'O número de série do dispositivo ("deviceSerial") é obrigatório.');
  }

  const terminalUid = `terminal_${schoolId}_${deviceSerial.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const terminalClaims: CustomClaims = {
    role: 'terminal',
    schoolId: schoolId,
  };

  await db.collection('terminals').doc(terminalUid).set({
    id: terminalUid,
    deviceSerial,
    location: deviceLocation || 'Portaria Principal',
    schoolId,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    status: 'active'
  }, { merge: true });

  const customToken = await auth.createCustomToken(terminalUid, terminalClaims);

  return {
    success: true,
    terminalUid,
    customToken,
    schoolId
  };
});
