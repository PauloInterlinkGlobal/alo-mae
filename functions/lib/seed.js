"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const db = admin.firestore();
exports.seedDatabase = (0, https_1.onCall)(async (request) => {
    // Apenas utilizadores com role instituicao ou admin podem disparar o seed
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticação necessária para executar seed.');
    }
    const role = request.auth.token?.role;
    if (role !== 'instituicao' && role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Apenas a instituição ou administrador podem semear dados.');
    }
    const schoolId = request.auth.token?.schoolId || 'school_horizonte_luanda';
    const batch = db.batch();
    // 1. Turmas & ClassStats
    const turmasData = [
        { classId: 'turma-8a', className: '8ª Classe — Turma A', teacherName: 'Prof. Teresa Silva', room: 'Sala 14', totalStudents: 32, presentsToday: 30, absentsToday: 1, latesToday: 1, monthlyPresents: 620, monthlyAbsences: 18, monthlyLates: 12, frequencyRate: 94.8, averageGrade: 14.5, schoolId },
        { classId: 'turma-8b', className: '8ª Classe — Turma B', teacherName: 'Prof. Teresa Silva', room: 'Sala 15', totalStudents: 28, presentsToday: 26, absentsToday: 2, latesToday: 0, monthlyPresents: 540, monthlyAbsences: 22, monthlyLates: 8, frequencyRate: 92.5, averageGrade: 13.8, schoolId },
        { classId: 'turma-9a', className: '9ª Classe — Turma A', teacherName: 'Prof. Carlos Mendes', room: 'Sala 18', totalStudents: 30, presentsToday: 28, absentsToday: 1, latesToday: 1, monthlyPresents: 580, monthlyAbsences: 15, monthlyLates: 10, frequencyRate: 95.2, averageGrade: 15.2, schoolId },
    ];
    turmasData.forEach(t => {
        const ref = db.collection('classStats').doc(t.classId);
        batch.set(ref, { ...t, updatedAt: new Date().toISOString() }, { merge: true });
    });
    // 2. Clínicas Médicas
    const clinicas = [
        {
            id: 'clinic_luanda_sul',
            name: 'Clínica Girassol — Polo Talatona',
            specialty: 'Pediatria e Urgência 24h',
            address: 'Av. Pedro de Castro Van-Dúnem Loy, Talatona, Luanda',
            district: 'Talatona',
            distanceKm: '1.8 km',
            timeMin: '4 min',
            emergencyPhone: '+244 923 111 222',
            services: ['Pronto-Socorro Infantil', 'Traumatologia Escolar', 'Bloco Operatório', 'Ambulância UTI'],
            imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=80',
            available24h: true,
            schoolId
        },
        {
            id: 'clinic_pediatrica_central',
            name: 'Hospital Pediátrico David Bernardino',
            specialty: 'Emergência Médica Pediátrica',
            address: 'Rua Amílcar Cabral, Maianga, Luanda',
            district: 'Maianga',
            distanceKm: '4.2 km',
            timeMin: '9 min',
            emergencyPhone: '+244 934 555 666',
            services: ['Cuidados Intensivos', 'Ortopedia Infantil', 'Toxicologia', 'Triagem de Manchester'],
            imageUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&auto=format&fit=crop&q=80',
            available24h: true,
            schoolId
        }
    ];
    clinicas.forEach(c => {
        const ref = db.collection('medicalClinics').doc(c.id);
        batch.set(ref, c, { merge: true });
    });
    await batch.commit();
    return {
        success: true,
        message: 'Base de dados Firestore inicializada com sucesso.'
    };
});
//# sourceMappingURL=seed.js.map