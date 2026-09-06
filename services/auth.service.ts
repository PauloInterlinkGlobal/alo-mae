import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/lib/types';

export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const user = userCredential.user;

  // Retrieve user profile from Firestore
  const userDocRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const profile = userSnap.data() as UserProfile;
    if (profile.active === false) {
      await fbSignOut(auth);
      throw new Error('A sua conta encontra-se desativada. Contacte a administração da instituição.');
    }

    // Update lastLoginAt
    await setDoc(userDocRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    return { ...profile, uid: user.uid };
  } else {
    // If user exists in Auth but not in Firestore, create default profile
    let role: UserRole = 'pai';
    if (email.includes('admin') || email.includes('colegio') || email.includes('instituicao')) {
      role = 'instituicao';
    } else if (email.includes('prof') || email.includes('docente') || email.includes('maria')) {
      role = 'professor';
    }

    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || email.split('@')[0],
      email: user.email || email,
      role,
      institutionId: 'school_horizonte_luanda',
      schoolId: 'school_horizonte_luanda',
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };

    await setDoc(userDocRef, newProfile);
    return newProfile;
  }
}

export async function logout(): Promise<void> {
  await fbSignOut(auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await fbSendPasswordResetEmail(auth, email.trim());
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function registerInitialUser(
  email: string,
  pass: string,
  profile: Partial<UserProfile>
): Promise<UserProfile> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const userDocRef = doc(db, 'users', cred.user.uid);
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      name: profile.name || email.split('@')[0],
      email: cred.user.email || email,
      role: profile.role || 'pai',
      institutionId: profile.institutionId || 'school_horizonte_luanda',
      schoolId: profile.institutionId || 'school_horizonte_luanda',
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...profile,
    };
    await setDoc(userDocRef, newProfile);
    return newProfile;
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      return loginWithEmail(email, pass);
    }
    throw err;
  }
}
