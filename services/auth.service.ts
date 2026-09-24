import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '@/lib/firebase';
import firebaseConfig from '@/firebase-applet-config.json';
import { UserProfile, UserRole } from '@/lib/types';
import { recordAuditLog } from './audit.service';

/**
 * Secondary Firebase Auth helper for administrative user creation.
 * Prevents the currently signed-in administrator from being logged out
 * when creating a new Guardian or Teacher account from the admin dashboard.
 */
function getSecondaryAuth() {
  const appName = 'AloMaeSecondaryAdminAuth';
  const existingApp = getApps().find((a) => a.name === appName);
  const secondaryApp = existingApp || initializeApp(firebaseConfig, appName);
  return getAuth(secondaryApp);
}

/**
 * Generates a strong random temporary password for newly provisioned accounts.
 * Contains uppercase, lowercase, numbers, and symbols.
 */
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AloMae#${randomPart}`;
}

/**
 * Helper to normalize phone numbers for querying (e.g. +244 923 884 912 -> +244923884912)
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Authenticate a user via email OR phone number + password.
 * Strictly verifies role against the intended portal (pai, professor, instituicao).
 * Never infers user role from email string!
 */
export async function loginUser(
  identifier: string,
  password: string,
  portalRole?: 'pai' | 'professor' | 'instituicao'
): Promise<{ user: UserProfile; mustChangePassword: boolean }> {
  if (!identifier || !identifier.trim()) {
    throw new Error('Por favor, introduza o seu e-mail ou número de telefone.');
  }
  if (!password) {
    throw new Error('Por favor, introduza a sua palavra-passe.');
  }

  const rawInput = identifier.trim();
  let emailToAuth = rawInput.toLowerCase();

  // If identifier does not have '@', assume it is a phone number and lookup user in Firestore
  if (!rawInput.includes('@')) {
    const rawClean = cleanPhoneNumber(rawInput);
    const digitsOnly = rawClean.replace(/\D/g, '');

    // Search users by phone variations (+244..., local 9..., etc.)
    const phoneCandidates = [
      rawInput,
      rawClean,
      rawClean.startsWith('+') ? rawClean : `+${rawClean}`,
      rawClean.startsWith('+244') ? rawClean.replace('+244', '').trim() : `+244${digitsOnly}`,
    ];

    let matchedUserDoc: any = null;
    for (const phoneAttempt of phoneCandidates) {
      if (!phoneAttempt) continue;
      const phoneQuery = query(collection(db, 'users'), where('phone', '==', phoneAttempt), limit(1));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) {
        matchedUserDoc = phoneSnap.docs[0];
        break;
      }
    }

    if (!matchedUserDoc) {
      throw new Error('Nenhuma conta encontrada com o número de telefone informado.');
    }

    const userData = matchedUserDoc.data();
    if (!userData.email) {
      throw new Error('Esta conta com telefone não possui um endereço de e-mail associado para autenticação.');
    }
    emailToAuth = userData.email.toLowerCase();
  }

  // 1. Authenticate with Firebase Authentication
  let firebaseUser: FirebaseUser;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, emailToAuth, password);
    firebaseUser = userCredential.user;
  } catch (authErr: any) {
    // SEGURANÇA (ADR 0004 · P0-1): nunca criar contas Auth no caminho de login.
    // Contas são provisionadas exclusivamente por Cloud Functions (Admin SDK).
    if (authErr.code === 'auth/too-many-requests') {
      throw new Error('Muitas tentativas falhadas. Por favor, aguarde alguns minutos e tente novamente.');
    } else {
      throw new Error('Utilizador não encontrado ou palavra-passe incorreta. Verifique os seus dados de acesso.');
    }
  }

  // 2. Fetch User Profile from Firestore users/{uid}
  let profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  let profileData: UserProfile | null = null;

  if (profileDoc.exists()) {
    profileData = { uid: firebaseUser.uid, ...profileDoc.data() } as UserProfile;
  } else {
    // Fallback: lookup by email in users collection if doc id differed
    const qEmail = query(collection(db, 'users'), where('email', '==', emailToAuth), limit(1));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      profileData = { uid: firebaseUser.uid, ...snapEmail.docs[0].data() } as UserProfile;
      // Mirror to doc(users, firebaseUser.uid)
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...profileData,
        uid: firebaseUser.uid,
        id: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }

  if (!profileData) {
    // SEGURANÇA (ADR 0004 · P1-6): sem perfil criado pela instituição, o acesso é negado.
    // O cliente nunca auto-cria perfis — perfil nasce nas Cloud Functions de enrolment.
    await fbSignOut(auth);
    throw new Error('Esta conta não possui perfil no Alô Mãe. Contacte a administração da instituição.');
  }

  // 3. Verify Account Active Status
  if (profileData.active === false) {
    await fbSignOut(auth);
    throw new Error('A sua conta encontra-se desativada. Por favor, contacte a administração da instituição.');
  }

  // 4. Role Verification (Strict RBAC - Never use email guessing!)
  const userRole = profileData.role;

  if (portalRole === 'pai') {
    if (userRole !== 'pai' && (userRole as any) !== 'encarregado') {
      await fbSignOut(auth);
      throw new Error('Esta conta não possui permissão para acessar o portal do encarregado.');
    }
  } else if (portalRole === 'professor') {
    if (userRole !== 'professor') {
      await fbSignOut(auth);
      throw new Error('Esta conta não possui permissão para acessar o portal do professor.');
    }
  } else if (portalRole === 'instituicao') {
    if (userRole !== 'instituicao' && userRole !== 'admin') {
      await fbSignOut(auth);
      throw new Error('Esta conta não possui permissão para acessar o painel administrativo.');
    }

    // Verify valid schoolId
    const schoolId = profileData.schoolId || profileData.institutionId;
    if (!schoolId && userRole !== 'admin') {
      await fbSignOut(auth);
      throw new Error('A sua conta de instituição não possui uma escola válida associada.');
    }
  }

  // 5. Update lastLoginAt in Firestore
  await updateDoc(doc(db, 'users', firebaseUser.uid), {
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch(() => null);

  // 6. Record Audit Log
  await recordAuditLog({
    institutionId: profileData.schoolId || profileData.institutionId || 'sem_escola',
    actorUid: firebaseUser.uid,
    actorName: profileData.name || profileData.email,
    actorRole: profileData.role,
    action: 'login',
    entityType: 'users',
    entityId: firebaseUser.uid,
    description: `Login efetuado no portal ${portalRole || profileData.role}`,
    timestamp: serverTimestamp(),
  }).catch(() => null);

  return {
    user: profileData,
    mustChangePassword: !!profileData.mustChangePassword,
  };
}

/**
 * Updates the authenticated user's password in Firebase Authentication,
 * sets mustChangePassword to false in Firestore, and audits the event.
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Nenhum utilizador autenticado para alterar a palavra-passe.');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('A nova palavra-passe deve conter pelo menos 6 caracteres.');
  }

  // 1. Update in Firebase Auth
  await fbUpdatePassword(currentUser, newPassword);

  // 2. Clear mustChangePassword in Firestore
  const userRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userRef, {
    mustChangePassword: false,
    updatedAt: serverTimestamp(),
  });

  // 3. Audit Log
  await recordAuditLog({
    institutionId: 'system',
    actorUid: currentUser.uid,
    actorName: currentUser.displayName || currentUser.email || 'Utilizador',
    actorRole: 'user',
    action: 'password_change',
    entityType: 'users',
    entityId: currentUser.uid,
    description: 'Palavra-passe alterada com sucesso.',
    timestamp: serverTimestamp(),
  }).catch(() => null);
}

/**
 * Sends an official Firebase Authentication password reset email.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!email || !email.includes('@')) {
    throw new Error('Por favor, introduza um endereço de e-mail válido.');
  }

  await fbSendPasswordResetEmail(auth, email.trim().toLowerCase());

  await recordAuditLog({
    institutionId: 'system',
    actorUid: auth.currentUser?.uid || 'anonymous',
    actorName: email.trim(),
    actorRole: 'anonymous',
    action: 'password_reset',
    entityType: 'users',
    entityId: email.trim(),
    description: `Solicitação de redefinição de palavra-passe enviada para ${email.trim()}`,
    timestamp: serverTimestamp(),
  }).catch(() => null);
}

/**
 * Institution Administrative Action:
 * Creates a new Encarregado (Guardian) or Professor with a generated temporary password.
 * Uses secondary Firebase Auth instance so the administrator remains logged in.
 * Never stores plain text password in Firestore!
 */
export async function createManagedUser(params: {
  name: string;
  email?: string;
  phone: string;
  role: 'pai' | 'professor';
  schoolId: string;
  studentIds?: string[];
  classIds?: string[];
  title?: string;
}): Promise<{ user: UserProfile; temporaryPassword: string }> {
  const currentAdmin = auth.currentUser;
  if (!currentAdmin) {
    throw new Error('Autenticação necessária para cadastrar utilizadores.');
  }

  const { name, phone, role, schoolId, studentIds, classIds, title } = params;

  if (!name.trim()) {
    throw new Error('O nome é obrigatório.');
  }
  if (!phone.trim()) {
    throw new Error('O número de telefone é obrigatório.');
  }

  // SEGURANÇA (ADR 0004 · P0-2): e-mail real é o identificador de credencial.
  // Nunca gerar e-mails sintéticos (ex.: pai_244...@escola.alomae.ao) — quebram
  // recuperação de conta e comunicação. O telefone é campo de contacto.
  if (!params.email?.trim() || !params.email.includes('@')) {
    throw new Error('O e-mail é obrigatório para criar o acesso. Se o encarregado não tiver e-mail, crie uma conta de e-mail com ele antes de o cadastrar.');
  }
  const normalizedEmail = params.email.trim().toLowerCase();
  const cleanPhone = cleanPhoneNumber(phone);

  // 1. Check if user already exists in Firestore by email or phone
  const qEmail = query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1));
  const snapEmail = await getDocs(qEmail);
  if (!snapEmail.empty) {
    throw new Error(`Já existe uma conta cadastrada com o e-mail ${normalizedEmail}.`);
  }

  const qPhone = query(collection(db, 'users'), where('phone', '==', cleanPhone), limit(1));
  const snapPhone = await getDocs(qPhone);
  if (!snapPhone.empty) {
    throw new Error(`Já existe uma conta cadastrada com o telefone ${cleanPhone}.`);
  }

  // 2. Generate secure temporary password
  const temporaryPassword = generateTemporaryPassword();

  // 3. Create user in Firebase Authentication via secondary app
  const secondaryAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, temporaryPassword);
  const newUid = cred.user.uid;

  // Immediately sign out from secondary app
  await fbSignOut(secondaryAuth);

  // 4. Create users/{uid} document in Firestore
  const userPayload: UserProfile = {
    uid: newUid,
    name: name.trim(),
    email: normalizedEmail,
    phone: cleanPhone,
    role,
    schoolIds: [schoolId],
    schoolId,
    studentIds: studentIds || [],
    classIds: classIds || [],
    title: title || (role === 'pai' ? 'Encarregado(a) de Educação' : 'Docente'),
    active: true,
    mustChangePassword: true,
    createdBy: 'institution',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', newUid), userPayload);

  // 5. If role is 'pai' and studentIds provided, link students in Firestore
  if (role === 'pai' && studentIds && studentIds.length > 0) {
    for (const sId of studentIds) {
      try {
        const studentRef = doc(db, 'students', sId);
        await updateDoc(studentRef, {
          parentUid: newUid,
          parentName: name.trim(),
          parentEmail: normalizedEmail,
          parentPhone: cleanPhone,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn(`Erro ao vincular aluno ${sId} ao encarregado:`, e);
      }
    }
  }

  // 6. If role is 'professor' and classIds provided, link classes
  if (role === 'professor' && classIds && classIds.length > 0) {
    for (const cId of classIds) {
      try {
        const classRef = doc(db, 'classes', cId);
        await updateDoc(classRef, {
          teacherIds: arrayUnion(newUid),
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn(`Erro ao vincular professor à turma ${cId}:`, e);
      }
    }
  }

  // 7. Audit log
  await recordAuditLog({
    institutionId: schoolId,
    actorUid: currentAdmin.uid,
    actorName: currentAdmin.displayName || currentAdmin.email || 'Administrador',
    actorRole: 'instituicao',
    action: 'account_created',
    entityType: 'users',
    entityId: newUid,
    description: `Conta de ${role} criada para ${name.trim()} (${normalizedEmail})`,
    timestamp: serverTimestamp(),
  }).catch(() => null);

  return {
    user: userPayload,
    temporaryPassword,
  };
}

/**
 * Toggle user account status (active: true/false)
 */
export async function toggleUserActiveStatus(uid: string, active: boolean): Promise<void> {
  const currentAdmin = auth.currentUser;
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    active,
    updatedAt: serverTimestamp(),
  });

  await recordAuditLog({
    institutionId: 'system',
    actorUid: currentAdmin?.uid || 'admin',
    actorName: currentAdmin?.displayName || currentAdmin?.email || 'Administrador',
    actorRole: 'instituicao',
    action: active ? 'user_reactivated' : 'user_deactivated',
    entityType: 'users',
    entityId: uid,
    description: `Utilizador ${uid} foi ${active ? 'reativado' : 'desativado'}`,
    timestamp: serverTimestamp(),
  }).catch(() => null);
}

/**
 * Link or unlink student to parent
 */
export async function associateStudentToParent(parentUid: string, studentId: string, schoolId: string): Promise<void> {
  const parentRef = doc(db, 'users', parentUid);
  const studentRef = doc(db, 'students', studentId);

  await updateDoc(parentRef, {
    studentIds: arrayUnion(studentId),
    schoolIds: arrayUnion(schoolId),
    updatedAt: serverTimestamp(),
  });

  const parentSnap = await getDoc(parentRef);
  const parentData = parentSnap.data();

  await updateDoc(studentRef, {
    parentUid,
    parentName: parentData?.name || '',
    parentEmail: parentData?.email || '',
    parentPhone: parentData?.phone || '',
    updatedAt: serverTimestamp(),
  });

  await recordAuditLog({
    institutionId: schoolId,
    actorUid: auth.currentUser?.uid || 'admin',
    actorName: auth.currentUser?.displayName || 'Administrador',
    actorRole: 'instituicao',
    action: 'link_student',
    entityType: 'students',
    entityId: studentId,
    description: `Aluno ${studentId} associado ao encarregado ${parentUid}`,
    timestamp: serverTimestamp(),
  }).catch(() => null);
}

export async function dissociateStudentFromParent(parentUid: string, studentId: string): Promise<void> {
  const parentRef = doc(db, 'users', parentUid);
  const studentRef = doc(db, 'students', studentId);

  await updateDoc(parentRef, {
    studentIds: arrayRemove(studentId),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(studentRef, {
    parentUid: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    updatedAt: serverTimestamp(),
  });

  await recordAuditLog({
    institutionId: 'system',
    actorUid: auth.currentUser?.uid || 'admin',
    actorName: auth.currentUser?.displayName || 'Administrador',
    actorRole: 'instituicao',
    action: 'unlink_student',
    entityType: 'students',
    entityId: studentId,
    description: `Aluno ${studentId} desvinculado do encarregado ${parentUid}`,
    timestamp: serverTimestamp(),
  }).catch(() => null);
}

/**
 * Reissue temporary credentials for a user
 */
export async function reissueCredentials(uid: string): Promise<string> {
  const currentAdmin = auth.currentUser;
  const newTempPass = generateTemporaryPassword();

  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    mustChangePassword: true,
    updatedAt: serverTimestamp(),
  });

  await recordAuditLog({
    institutionId: 'system',
    actorUid: currentAdmin?.uid || 'admin',
    actorName: currentAdmin?.displayName || 'Administrador',
    actorRole: 'instituicao',
    action: 'password_reset',
    entityType: 'users',
    entityId: uid,
    description: `Credenciais temporárias reemitidas para o utilizador ${uid}`,
    timestamp: serverTimestamp(),
  }).catch(() => null);

  return newTempPass;
}

/**
 * Sign out the currently authenticated user
 */
export async function logout(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Subscribe to Firebase Auth state
 */
export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Legacy compatibility helper
 */
export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  const result = await loginUser(email, password);
  return result.user;
}
