#!/usr/bin/env node
/**
 * Auditoria rápida Firebase — Alô Mãe
 * Verifica configuração, domínios autorizados e conectividade Firestore.
 *
 * Uso: node scripts/check-firebase.mjs
 *       npm run check:firebase
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'firebase-applet-config.json');

console.log('🔍 Alô Mãe — Auditoria Firebase\n' + '='.repeat(50));

let config = null;
if (existsSync(configPath)) {
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
    console.log('📄 firebase-applet-config.json encontrado');
    console.log(`   projectId: ${config.projectId}`);
    console.log(`   authDomain: ${config.authDomain}`);
    console.log(`   apiKey: ${config.apiKey ? '***' + config.apiKey.slice(-6) : '(vazio)'}`);
    console.log(`   oAuthClientId: ${config.oAuthClientId ? config.oAuthClientId.slice(0, 20) + '…' : '(vazio)'}`);
  } catch (e) {
    console.error('❌ Erro ao ler firebase-applet-config.json:', e.message);
  }
} else {
  console.error('❌ firebase-applet-config.json não encontrado em', configPath);
}

console.log('\n🔐 ENV NEXT_PUBLIC_FIREBASE_*');
const envKeys = ['NEXT_PUBLIC_FIREBASE_API_KEY','NEXT_PUBLIC_FIREBASE_PROJECT_ID','NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN','NEXT_PUBLIC_FIREBASE_APP_ID','NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET','NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'];
let hasEnv = false;
for (const k of envKeys) {
  const v = process.env[k];
  if (v) {
    hasEnv = true;
    console.log(`   ${k}=${k.includes('API_KEY') ? '***' + v.slice(-6) : v}`);
  } else {
    console.log(`   ${k}= (não definido — usará JSON)`);
  }
}
if (!hasEnv) console.log('   → Nenhum env definido, usando apenas JSON (ok para dev)');

console.log('\n🌐 Domínios que DEVEM estar em Firebase Console > Authentication > Settings > Authorized domains');
const hostname = config?.authDomain || 'kingly-channel-c8gvj.firebaseapp.com';
const suggested = [
  'localhost',
  '127.0.0.1',
  hostname,
  `${config?.projectId || 'kingly-channel-c8gvj'}.firebaseapp.com`,
  `${config?.projectId || 'kingly-channel-c8gvj'}.web.app`,
  'aistudio.google.com',
  '*.cloudworkstations.dev',
  '*.aistudio.google.com',
  '*.e2b.app',
  'ai-studio-almeconexoquecui-c859596d-ed42-4f57-9605-de70a18847eb',
  'ai-studio-almeconexoquecui-c859596d-ed42-4f57-9605-de70a18847eb.cloudworkstations.dev',
];
suggested.forEach(d => console.log(`   • ${d}`));
console.log(`\n   Link direto: https://console.firebase.google.com/project/${config?.projectId || 'kingly-channel-c8gvj'}/authentication/settings`);

console.log('\n🔎 Verificações de causa raiz para auth/unauthorized-domain');
console.log('   1. O domínio atual do preview NÃO está na lista acima? → Adicione-o. Esse é o erro #1 nas screenshots.');
console.log('   2. API key com restrição HTTP referrer? → Console Cloud > APIs & Credentials > API key > Website restrictions deve permitir o hostname ou “None”.');
console.log('   3. Google provider desativado? → Authentication > Sign-in method > Google > Enable + suporte a e-mail.');
console.log('   4. OAuth consent screen pendente? → Verifique Google Cloud > OAuth consent screen.');
console.log('   5. authDomain corresponde ao projectId? → authDomain deve ser <projectId>.firebaseapp.com');

console.log('\n🗄️ Firestore');
console.log('   Padrão: (default) via getFirestore(app). Se seu Firestore usa ID custom, adicione firestoreDatabaseId a firebase-applet-config.json ou NEXT_PUBLIC_FIREBASE_DATABASE_ID.');
console.log('   Verifique: Firebase Console > Firestore Database > se “Create database” aparece, ainda não foi criado.');
console.log('   Regras atuais exigem autenticação para users/{uid}; o probe de conectividade deve retornar permission-denied (indica ligação OK).');
if (config?.firestoreDatabaseId) console.log(`   firestoreDatabaseId configurado: ${config.firestoreDatabaseId}`);

console.log('\n🧪 Teste manual no navegador (console devTools):');
console.log('   getFirebaseDiagnostics()  // JSON com hostname, config mascarada e lista de domínios esperados');
console.log('   checkFirestoreConnectivity().then(console.log)');
console.log('   // Após corrigir domínio, esse aviso auth/unauthorized-domain desaparece sem rebuild.');

console.log('\n✅ Auditoria concluída. Se persistir, copie a saída e a mensagem completa de error.code / error.message do console -> Firebase Support.');

// Opcional: tentar import dinâmico para teste de inicialização sem quebrar CI (sem env)
try {
  const { initializeApp } = await import('firebase/app');
  if (config?.apiKey && config?.projectId) {
    const testApp = initializeApp(config, 'audit-probe');
    console.log('\n🧩 Firebase SDK initializeApp: OK (config sintaticamente válida)');
    // não mantemos
    const { deleteApp } = await import('firebase/app');
    await deleteApp(testApp);
  } else {
    console.log('\n⚠️ initializeApp não testado — config incompleta');
  }
} catch (e) {
  console.warn('\n⚠️ Teste SDK falhou (ok em CI sem deps):', e.message?.slice(0,200));
}
