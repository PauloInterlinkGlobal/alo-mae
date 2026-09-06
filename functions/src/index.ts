import * as admin from 'firebase-admin';

// Inicializar SDK Admin do Firebase
if (!admin.apps.length) {
  admin.initializeApp();
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
