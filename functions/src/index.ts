import * as admin from 'firebase-admin';

// Inicializar SDK Admin do Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}

// Exportar Funções de Autenticação, Professores e Dispositivos (HTTPS Callables)
export { linkParentToStudent, provisionTerminalDevice, provisionTeacherClass } from './auth';

// Exportar Triggers Reativos do Firestore
export { onAccessLogCreated, recalculateClassStats } from './triggers';
