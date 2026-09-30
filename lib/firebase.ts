import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import type { Analytics } from 'firebase/analytics';
import staticFirebaseConfig from '../firebase-applet-config.json';

/**
 * Firebase's web configuration is intentionally public, but it must still be
 * the configuration for the same project as the deployed app. Keep the
 * checked-in config as a safe default for local builds and allow Vercel (or
 * another host) to provide the public values through NEXT_PUBLIC_* variables.
 *
 * The explicit property accesses are intentional: Next.js can inline these
 * values into the browser bundle at build time.
 */
const firebaseConfig = {
  ...staticFirebaseConfig,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || staticFirebaseConfig.apiKey,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || staticFirebaseConfig.appId,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || staticFirebaseConfig.authDomain,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || staticFirebaseConfig.messagingSenderId,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || staticFirebaseConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || staticFirebaseConfig.storageBucket,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || staticFirebaseConfig.measurementId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export const auth = getAuth(app);
export const storage = getStorage(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
    isSupported().then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
      }
    }).catch(() => {
      // Analytics not supported in this environment
    });
  }).catch(() => {});
}

export const getAnalyticsInstance = () => analyticsInstance;
export default app;
