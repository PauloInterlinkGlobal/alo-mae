import * as admin from 'firebase-admin';

// Inicializar SDK Admin do Firebase para o projeto liga-so
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'liga-so',
    storageBucket: process.env.STORAGE_BUCKET || 'liga-so.firebasestorage.app',
  });
}

// Exportar Funções de Matrícula, Professores e Dispositivos (HTTPS Callables)
export {
  enrollStudent,
  enrollTeacher,
  provisionTerminalDevice,
  provisionTeacherClass,
  linkParentToStudent,
} from './auth';

// Exportar Triggers Reativos do Firestore
export {
  onAccessLogCreated,
  recalculateClassStats,
  onMiniPautaApproved,
  onGradeApproved,
} from './triggers';

// Exportar Função de Seeding Administrativo
export { seedDatabase } from './seed';
