import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDoc } from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

/**
 * ==========================================================
 * Firebase Initialization — Alô Mãe
 * Suporta duas fontes de configuração (prioridade: ENV > applet JSON):
 *  1. Variáveis de ambiente NEXT_PUBLIC_FIREBASE_* (recomendado em prod/Studio)
 *  2. firebase-applet-config.json (fallback para desenvolvimento / AI Studio)
 *
 * Domain authorization fix:
 *  O erro `auth/unauthorized-domain` NÃO é bug de código — é o domínio
 *  atual que não está em Firebase Console > Authentication > Settings >
 *  Authorized domains. Esta inicialização expõe diagnósticos para detetar
 *  esse caso rapidamente (ver getFirebaseDiagnostics).
 * ==========================================================
 */

type FirebaseAppletConfig = {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
  firestoreDatabaseId?: string;
};

// Resolve config with ENV fallback — permite que o deploy em AI Studio / Vercel
// sobrescreva o JSON sem precisar commitar segredos.
function resolveFirebaseConfig(): FirebaseAppletConfig {
  const env = typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : {};

  const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY || (appletConfig as any).apiKey;
  const appId = env.NEXT_PUBLIC_FIREBASE_APP_ID || (appletConfig as any).appId;
  const authDomain = env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || (appletConfig as any).authDomain;
  const messagingSenderId = env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || (appletConfig as any).messagingSenderId;
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || (appletConfig as any).projectId;
  const storageBucket = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || (appletConfig as any).storageBucket;

  return {
    projectId: projectId || '',
    appId: appId || '',
    apiKey: apiKey || '',
    authDomain: authDomain || '',
    storageBucket: storageBucket || '',
    messagingSenderId: messagingSenderId || '',
    measurementId: (appletConfig as any).measurementId || '',
    oAuthClientId: (appletConfig as any).oAuthClientId || '',
    recaptchaSiteKey: (appletConfig as any).recaptchaSiteKey || '',
    firestoreDatabaseId: (appletConfig as any).firestoreDatabaseId || env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || '',
  };
}

export const firebaseConfig = resolveFirebaseConfig();

// Validação early — falha silenciosa em cliente, mas loga em dev para facilitar auditoria
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
  console.warn(
    '[Firebase] Configuração incompleta detectada.\n' +
      '  Verifique NEXT_PUBLIC_FIREBASE_* no .env ou firebase-applet-config.json\n' +
      `  Atual: projectId=${firebaseConfig.projectId || '(vazio)'} authDomain=${firebaseConfig.authDomain || '(vazio)'} apiKey=${firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-6) : '(vazio)'}\n` +
      '  Causas comuns: env var vazias em .env.example / preview domínio não autorizado.'
  );
}

const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig as any) : getApp();

export const db: Firestore = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

export const auth: Auth = getAuth(app);

// Em alguns hosts (Capacitor / iframe Studio) o Firebase Auth precisa que o
// authDomain esteja explicitamente no hostname atual. Não força, mas expõe helper.
export function getCurrentHostname(): string {
  if (typeof window === 'undefined') return '(SSR)';
  return window.location.hostname;
}

/**
 * Diagnóstico completo da ligação Firebase.
 * Execute em console do navegador: `getFirebaseDiagnostics()`
 * ou importe em qualquer componente para exibir banner de ajuda.
 */
export interface FirebaseDiagnostics {
  config: FirebaseAppletConfig;
  hostname: string;
  isLocalhost: boolean;
  isStudioPreview: boolean;
  expectedAuthorizedDomains: string[];
  isConfigValid: boolean;
  missingKeys: string[];
  advice: string;
}

export function getFirebaseDiagnostics(): FirebaseDiagnostics {
  const hostname = getCurrentHostname();
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const isStudioPreview =
    hostname.includes('cloudworkstations.dev') ||
    hostname.includes('aistudio.google.com') ||
    hostname.includes('studio.firebase.google.com') ||
    hostname.includes('web.app') ||
    hostname.includes('firebaseapp.com') ||
    hostname.includes('e2b.app') ||
    hostname.includes('ai-studio') ||
    hostname.includes('almeconexoquecui');

  const missingKeys: string[] = [];
  if (!firebaseConfig.apiKey) missingKeys.push('apiKey');
  if (!firebaseConfig.authDomain) missingKeys.push('authDomain');
  if (!firebaseConfig.projectId) missingKeys.push('projectId');
  if (!firebaseConfig.appId) missingKeys.push('appId');

  const isConfigValid = missingKeys.length === 0;

  const expectedAuthorizedDomains = [
    'localhost',
    '127.0.0.1',
    firebaseConfig.authDomain,
    `${firebaseConfig.projectId}.firebaseapp.com`,
    `${firebaseConfig.projectId}.web.app`,
    // Studio / AI Studio / Workstations preview domains
    'aistudio.google.com',
    '*.cloudworkstations.dev',
    '*.aistudio.google.com',
    '*.e2b.app',
    // Se o Studio gerou um host custom (ai-studio-xxx), adicione o hostname atual
    hostname,
  ].filter(Boolean);

  let advice = '';
  if (!isConfigValid) {
    advice =
      'Configuração Firebase incompleta. Preencha NEXT_PUBLIC_FIREBASE_* no .env ou atualize firebase-applet-config.json a partir de Firebase Console > Project Settings > Your apps > SDK setup.';
  } else if (isStudioPreview || !isLocalhost) {
    advice =
      `Domínio atual: "${hostname}". Se vir erro auth/unauthorized-domain, adicione este domínio em Firebase Console > Authentication > Settings > Authorized domains > Add domain.` +
      ` Em localhost funciona, mas previews do AI Studio / E2B precisam ser autorizados manualmente.`;
  }

  return {
    config: { ...firebaseConfig, apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-6) : '' } as any,
    hostname,
    isLocalhost,
    isStudioPreview,
    expectedAuthorizedDomains,
    isConfigValid,
    missingKeys,
    advice,
  };
}

// Expor globalmente em dev para facilitar auditoria no console do preview
if (typeof window !== 'undefined') {
  (window as any).getFirebaseDiagnostics = getFirebaseDiagnostics;
  // Log inicial apenas uma vez, não poluindo produção
  if (process.env.NODE_ENV !== 'production') {
    const diag = getFirebaseDiagnostics();
    if (diag.missingKeys.length) {
      console.warn('[Firebase Diagnostics]', diag);
    }
  }
}

/**
 * Teste leve de conectividade Firestore (leitura anónima / autenticada).
 * Não lança — retorna status para UI de diagnóstico.
 */
export async function checkFirestoreConnectivity(): Promise<{
  ok: boolean;
  errorCode?: string;
  message: string;
}> {
  try {
    // Tenta ler um doc inexistente — se as regras bloquearem, receberemos permission-denied
    // (que já indica que a ligação com o projeto está OK mas sem sessão).
    // Se for unavailable / failed-precondition, indica databaseId errado ou firestore não habilitado.
    const probeRef = doc(db, 'users', '__connectivity_probe__');
    await getDoc(probeRef);
    return { ok: true, message: 'Firestore acessível (probe OK).' };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'permission-denied' || code === 'unauthenticated') {
      return {
        ok: true,
        errorCode: code,
        message: 'Firestore ligado — regras exigem autenticação (comportamento esperado para probe).',
      };
    }
    if (code === 'unavailable' || code === 'failed-precondition') {
      return {
        ok: false,
        errorCode: code,
        message:
          `Firestore indisponível (${code}). Verifique se o Firestore foi criado no projeto "${firebaseConfig.projectId}"` +
          ` (Firestore > Create database) e se firestoreDatabaseId está correto (atual: ${(firebaseConfig as any).firestoreDatabaseId || '(default)'}).`,
      };
    }
    if (code === 'not-found') {
      return { ok: true, message: 'Firestore ativo (not-found esperado para probe).' };
    }
    return {
      ok: false,
      errorCode: code || 'unknown',
      message: err?.message || 'Erro desconhecido ao contactar Firestore.',
    };
  }
}

export default app;
