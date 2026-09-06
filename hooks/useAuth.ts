'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { loginWithEmail, logout as authLogout, sendPasswordReset } from '@/services/auth.service';

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
      } else {
        // Listen to Firestore profile
        const unsubProfile = onSnapshot(
          doc(db, 'users', user.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile({ uid: user.uid, ...docSnap.data() } as UserProfile);
            } else {
              setUserProfile(null);
            }
            setLoading(false);
          },
          (err) => {
            console.error('Erro ao escutar perfil do utilizador:', err);
            setLoading(false);
          }
        );
        return () => unsubProfile();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return {
    user: firebaseUser,
    profile: userProfile,
    isAuthenticated: !!firebaseUser && !!userProfile,
    loading,
    login: loginWithEmail,
    logout: authLogout,
    resetPassword: sendPasswordReset,
  };
}
