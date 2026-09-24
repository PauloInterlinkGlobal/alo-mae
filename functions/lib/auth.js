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
exports.linkParentToStudent = exports.provisionTeacherClass = exports.provisionTerminalDevice = exports.enrollTeacher = exports.enrollStudent = void 0;
exports.setUserCustomClaims = setUserCustomClaims;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const auth = admin.auth();
const db = admin.firestore();
/**
 * Helper to update user claims
 */
async function setUserCustomClaims(uid, claims) {
    await auth.setCustomUserClaims(uid, claims);
}
/**
 * HTTPS Callable: enrollStudent (v3)
 * Só invocável por instituição escolar.
 * Cadastra aluno, pesquisa ou cria encarregado (pai) e vincula às turmas e claims.
 */
exports.enrollStudent = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'É necessária autenticação para matricular alunos.');
    }
    const callerRole = request.auth.token.role;
    const schoolId = request.auth.token.schoolId;
    if (callerRole !== 'instituicao' || !schoolId) {
        throw new https_1.HttpsError('permission-denied', 'Apenas a instituição pode matricular alunos.');
    }
    const { student, parent, classId } = request.data;
    if (!student?.matricula || !student?.name || !parent?.email || !parent?.phone || !classId) {
        throw new https_1.HttpsError('invalid-argument', 'Campos obrigatórios: student.matricula, student.name, parent.email, parent.phone e classId.');
    }
    const normalizedEmail = parent.email.trim().toLowerCase();
    const rawPhone = parent.phone.replace(/[^\d+]/g, '');
    try {
        // 1. Procurar ou criar pai existente por email/telefone
        let parentUid;
        let existingParentDoc = null;
        try {
            const authUser = await auth.getUserByEmail(normalizedEmail);
            parentUid = authUser.uid;
            existingParentDoc = await db.collection('users').doc(parentUid).get();
        }
        catch (err) {
            if (err.code !== 'auth/user-not-found')
                throw err;
            // Se não existir por email, pesquisar por telefone no Firestore
            const phoneQuery = await db.collection('users')
                .where('phone', '==', rawPhone)
                .where('role', '==', 'pai')
                .limit(1)
                .get();
            if (!phoneQuery.empty) {
                parentUid = phoneQuery.docs[0].id;
                existingParentDoc = phoneQuery.docs[0];
            }
            else {
                // Criar utilizador no Firebase Auth
                const tempPassword = `AloMae#${Math.random().toString(36).slice(-8)}`;
                const newAuthUser = await auth.createUser({
                    email: normalizedEmail,
                    phoneNumber: rawPhone.startsWith('+') ? rawPhone : undefined,
                    displayName: parent.name.trim(),
                    password: tempPassword,
                });
                parentUid = newAuthUser.uid;
            }
        }
        // 2. Gerar ID determinístico e idempotente do aluno
        const studentId = `std_${schoolId}_${student.matricula.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const studentRef = db.collection('students').doc(studentId);
        const classRef = db.collection('classes').doc(classId);
        await db.runTransaction(async (transaction) => {
            const studentDoc = await transaction.get(studentRef);
            const isNewStudent = !studentDoc.exists;
            const previousClassId = studentDoc.exists ? studentDoc.data()?.classId : null;
            // Carregar turma para obter nome da turma
            const classDoc = await transaction.get(classRef);
            const className = classDoc.exists ? classDoc.data()?.name || 'Turma Atribuída' : 'Turma Atribuída';
            const studentPayload = {
                id: studentId,
                matricula: student.matricula.trim(),
                name: student.name.trim(),
                fullName: student.name.trim(),
                classId,
                className,
                schoolId,
                parentUid,
                parentName: parent.name.trim(),
                parentPhone: rawPhone,
                parentEmail: normalizedEmail,
                photoUrl: student.photoUrl || '',
                status: studentDoc.exists ? studentDoc.data()?.status || 'absent' : 'absent',
                biometricCode: student.biometricCode || `BIO-FACIAL-${Math.floor(10000 + Math.random() * 90000)}-${student.name.split(' ')[0].toUpperCase()}`,
                insurancePolicyId: student.insurancePolicyId || '',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: isNewStudent ? admin.firestore.FieldValue.serverTimestamp() : studentDoc.data()?.createdAt,
            };
            transaction.set(studentRef, studentPayload, { merge: true });
            // Atualizar documento do pai com arrayUnion
            const parentUserRef = db.collection('users').doc(parentUid);
            transaction.set(parentUserRef, {
                id: parentUid,
                name: parent.name.trim(),
                email: normalizedEmail,
                phone: rawPhone,
                role: 'pai',
                studentIds: admin.firestore.FieldValue.arrayUnion(studentId),
                schoolIds: admin.firestore.FieldValue.arrayUnion(schoolId),
                active: true,
                mustChangePassword: true,
                createdBy: 'institution',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            // Incrementar contador de alunos na turma se for novo ou mudou de turma
            if (isNewStudent) {
                transaction.set(classRef, {
                    studentCount: admin.firestore.FieldValue.increment(1),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
            else if (previousClassId && previousClassId !== classId) {
                const prevClassRef = db.collection('classes').doc(previousClassId);
                transaction.set(prevClassRef, {
                    studentCount: admin.firestore.FieldValue.increment(-1),
                }, { merge: true });
                transaction.set(classRef, {
                    studentCount: admin.firestore.FieldValue.increment(1),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
        });
        // 3. Atualizar Custom Claims do Pai
        const parentAuth = await auth.getUser(parentUid);
        const claims = parentAuth.customClaims || {};
        const existingStudentIds = Array.isArray(claims.studentIds) ? claims.studentIds : [];
        const existingSchoolIds = Array.isArray(claims.schoolIds) ? claims.schoolIds : [];
        const updatedStudentIds = Array.from(new Set([...existingStudentIds, studentId]));
        const updatedSchoolIds = Array.from(new Set([...existingSchoolIds, schoolId]));
        await auth.setCustomUserClaims(parentUid, {
            ...claims,
            role: 'pai',
            studentIds: updatedStudentIds,
            schoolIds: updatedSchoolIds,
        });
        return {
            success: true,
            message: `Aluno ${student.name} matriculado com sucesso.`,
            studentId,
            parentUid,
            isExistingParent: !!existingParentDoc?.exists,
        };
    }
    catch (error) {
        console.error('Erro em enrollStudent:', error);
        throw new https_1.HttpsError('internal', error.message || 'Falha ao processar matrícula.');
    }
});
/**
 * HTTPS Callable: enrollTeacher (v3)
 * Cria ou atualiza docente para uma escola específica e associa turmas em classes/{id}.teacherIds
 */
exports.enrollTeacher = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'É necessária autenticação para cadastrar docentes.');
    }
    const callerRole = request.auth.token.role;
    const schoolId = request.auth.token.schoolId;
    if (callerRole !== 'instituicao' || !schoolId) {
        throw new https_1.HttpsError('permission-denied', 'Apenas a instituição pode cadastrar docentes.');
    }
    const { teacher, classIds } = request.data;
    if (!teacher?.email || !teacher?.name || !Array.isArray(classIds)) {
        throw new https_1.HttpsError('invalid-argument', 'O email, nome e lista de turmas são obrigatórios.');
    }
    const normalizedEmail = teacher.email.trim().toLowerCase();
    const rawPhone = teacher.phone ? teacher.phone.replace(/[^\d+]/g, '') : '';
    try {
        let teacherUid;
        let isNewUser = false;
        try {
            const existing = await auth.getUserByEmail(normalizedEmail);
            teacherUid = existing.uid;
        }
        catch (err) {
            if (err.code !== 'auth/user-not-found')
                throw err;
            const tempPassword = `Prof#${Math.random().toString(36).slice(-8)}`;
            const newAuth = await auth.createUser({
                email: normalizedEmail,
                displayName: teacher.name.trim(),
                phoneNumber: rawPhone.startsWith('+') ? rawPhone : undefined,
                password: tempPassword,
            });
            teacherUid = newAuth.uid;
            isNewUser = true;
        }
        const teacherRef = db.collection('users').doc(teacherUid);
        const teacherSnap = await teacherRef.get();
        if (teacherSnap.exists) {
            const data = teacherSnap.data();
            if (data.schoolId && data.schoolId !== schoolId) {
                throw new https_1.HttpsError('failed-precondition', 'Este docente já está vinculado a outra instituição de ensino.');
            }
        }
        // 1. Atualizar utilizador no Firestore
        await teacherRef.set({
            id: teacherUid,
            name: teacher.name.trim(),
            email: normalizedEmail,
            phone: rawPhone,
            role: 'professor',
            schoolId,
            title: teacher.title || 'Docente',
            classIds: admin.firestore.FieldValue.arrayUnion(...classIds),
            active: true,
            mustChangePassword: true,
            createdBy: 'institution',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: teacherSnap.exists ? teacherSnap.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        // 2. Atualizar classes/{classId}.teacherIds para cada turma
        const batch = db.batch();
        for (const cId of classIds) {
            const cRef = db.collection('classes').doc(cId);
            batch.set(cRef, {
                teacherIds: admin.firestore.FieldValue.arrayUnion(teacherUid),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        await batch.commit();
        // 3. Atualizar Custom Claims do Professor
        const teacherRecord = await auth.getUser(teacherUid);
        const currentClaims = teacherRecord.customClaims || {};
        const existingClassIds = Array.isArray(currentClaims.classIds) ? currentClaims.classIds : [];
        const mergedClassIds = Array.from(new Set([...existingClassIds, ...classIds]));
        await auth.setCustomUserClaims(teacherUid, {
            ...currentClaims,
            role: 'professor',
            schoolId,
            classIds: mergedClassIds,
        });
        return {
            success: true,
            message: `Docente ${teacher.name} registado com sucesso.`,
            teacherUid,
            schoolId,
            assignedClassIds: mergedClassIds,
            isNewUser,
        };
    }
    catch (error) {
        console.error('Erro em enrollTeacher:', error);
        throw new https_1.HttpsError('internal', error.message || 'Falha ao processar registo de docente.');
    }
});
/**
 * HTTPS Callable: provisionTerminalDevice (v3)
 */
exports.provisionTerminalDevice = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'É necessária autenticação para provisionar quiosques.');
    }
    const callerToken = request.auth.token;
    if (callerToken.role !== 'instituicao' || !callerToken.schoolId) {
        throw new https_1.HttpsError('permission-denied', 'Apenas a instituição pode provisionar quiosques.');
    }
    const schoolId = callerToken.schoolId;
    const { deviceSerial, deviceLocation } = request.data;
    if (!deviceSerial) {
        throw new https_1.HttpsError('invalid-argument', 'O número de série do dispositivo é obrigatório.');
    }
    const terminalUid = `terminal_${schoolId}_${deviceSerial.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    await db.collection('terminals').doc(terminalUid).set({
        id: terminalUid,
        deviceSerial,
        location: deviceLocation || 'Portaria Principal',
        schoolId,
        status: 'active',
        lastProvisionedAt: new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    const customToken = await auth.createCustomToken(terminalUid, {
        role: 'terminal',
        schoolId,
    });
    return {
        success: true,
        terminalUid,
        customToken,
        schoolId,
    };
});
/**
 * Compatibilidade legada
 */
exports.provisionTeacherClass = exports.enrollTeacher;
exports.linkParentToStudent = (0, https_1.onCall)(async (request) => {
    const { parentUid, studentId } = request.data;
    if (!parentUid || !studentId) {
        throw new https_1.HttpsError('invalid-argument', 'Faltam dados.');
    }
    const studentSnap = await db.collection('students').doc(studentId).get();
    if (!studentSnap.exists)
        throw new https_1.HttpsError('not-found', 'Aluno não encontrado.');
    const schoolId = studentSnap.data()?.schoolId;
    await db.collection('users').doc(parentUid).set({
        studentIds: admin.firestore.FieldValue.arrayUnion(studentId),
        schoolIds: admin.firestore.FieldValue.arrayUnion(schoolId),
    }, { merge: true });
    return { success: true };
});
//# sourceMappingURL=auth.js.map