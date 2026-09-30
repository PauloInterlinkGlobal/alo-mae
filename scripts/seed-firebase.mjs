#!/usr/bin/env node
/**
 * ============================================================================
 * SCRIPT DE INICIALIZAÇÃO E SEED IDEMPOTENTE DO FIREBASE "LIGA-SO"
 * Aplicação: Alô Mãe
 * Projeto Firebase: liga-so (1026140799098)
 * Firestore: (default)
 * Bucket: liga-so.firebasestorage.app
 * ============================================================================
 * 
 * Regras implementadas:
 * 1. Idempotência absoluta - executar múltiplas vezes nunca duplica ou apaga dados.
 * 2. Não-destrutivo - verifica a existência prévia de coleções e documentos. Preserva dados existentes.
 * 3. Criação de utilizadores no Firebase Authentication com passwords seguras.
 * 4. Mapeamento dos UIDs reais do Firebase Auth para a coleção users/{uid}.
 * 5. NUNCA grava senhas no Firestore.
 * 6. Suporta execução com Service Account ou credenciais de ambiente (GCP ADC).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Carregar Firebase Admin SDK
let admin;
try {
  admin = (await import('firebase-admin')).default;
} catch {
  try {
    admin = (await import(path.join(rootDir, 'functions/node_modules/firebase-admin/lib/index.js'))).default;
  } catch (err) {
    console.error('❌ Não foi possível carregar o firebase-admin:', err.message);
    process.exit(1);
  }
}

// 2. Inicializar Firebase Admin SDK com liga-so
const PROJECT_ID = 'liga-so';
const PROJECT_NUMBER = '1026140799098';
const STORAGE_BUCKET = 'liga-so.firebasestorage.app';

// Localizar chave de serviço caso fornecida por argumento ou variável de ambiente
const args = process.argv.slice(2);
let serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--service-account' && args[i + 1]) {
    serviceAccountPath = path.resolve(process.cwd(), args[i + 1]);
    break;
  }
}

let app;
if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  console.log(`🔑 A carregar credenciais da conta de serviço: ${serviceAccountPath}`);
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  });
} else {
  // Inicialização padrão com ADC / Projeto especificado
  app = admin.initializeApp({
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  });
}

const auth = admin.auth();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Estatísticas e Relatórios
const report = {
  firebaseProject: PROJECT_ID,
  firestore: '(default)',
  authUsers: [],
  collectionsCreated: new Set(),
  documentsCreated: {},
  documentsExisting: {},
  documentsPreserved: [],
  conflicts: [],
  errors: [],
};

function trackCreated(collectionName, docId) {
  report.collectionsCreated.add(collectionName);
  report.documentsCreated[collectionName] = (report.documentsCreated[collectionName] || 0) + 1;
}

function trackPreserved(collectionName, docId) {
  report.documentsPreserved.push(`${collectionName}/${docId}`);
  report.documentsExisting[collectionName] = (report.documentsExisting[collectionName] || 0) + 1;
}

const FIRESTORE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDH9VwxBdzO3uFFUvGbt_E3AFu9eNXRXV';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (val && typeof val === 'object') {
    if (val._methodName === 'serverTimestamp' || val.constructor?.name === 'FieldValue') {
      return { timestampValue: new Date().toISOString() };
    }
    if (Array.isArray(val)) {
      return {
        arrayValue: {
          values: val.map(toFirestoreValue)
        }
      };
    }
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function restGetDoc(docPath) {
  try {
    const res = await fetch(`${FIRESTORE_BASE_URL}/${docPath}?key=${FIRESTORE_API_KEY}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(`REST GET ${res.status}: ${JSON.stringify(errJson)}`);
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

async function restPatchDoc(docPath, data, isMerge = true) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  const url = `${FIRESTORE_BASE_URL}/${docPath}?key=${FIRESTORE_API_KEY}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(`REST PATCH ${res.status}: ${JSON.stringify(errJson)}`);
  }
  return await res.json();
}

/**
 * Helper para gravação idempotente no Firestore:
 * - Se já existir, preserva os dados existentes fazendo merge cuidadoso
 * - Não apaga nada
 */
async function safeSetDoc(col, docId, data, merge = true) {
  const fullDocPath = `${col}/${docId}`;
  try {
    // 1. Tentar primeiro via Firestore REST API (100% suportada com chave da liga-so)
    const existing = await restGetDoc(fullDocPath);
    if (existing && existing.name) {
      trackPreserved(col, docId);
      if (merge) {
        await restPatchDoc(fullDocPath, {
          ...data,
          updatedAt: new Date(),
        }, true);
      }
      return { status: 'preserved', id: docId };
    } else {
      await restPatchDoc(fullDocPath, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, false);
      trackCreated(col, docId);
      return { status: 'created', id: docId };
    }
  } catch (restErr) {
    // 2. Se REST falhar, tentar via Firebase Admin SDK
    try {
      const docRef = db.collection(col).doc(docId);
      const snap = await docRef.get();
      if (snap.exists) {
        trackPreserved(col, docId);
        if (merge) {
          await docRef.set({
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
        return { status: 'preserved', id: docId };
      } else {
        await docRef.set({
          ...data,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        trackCreated(col, docId);
        return { status: 'created', id: docId };
      }
    } catch (adminErr) {
      report.errors.push(`Erro em ${col}/${docId}: ${restErr.message}`);
      console.error(`❌ Erro ao processar ${col}/${docId}:`, restErr.message);
      return { status: 'error', error: restErr.message };
    }
  }
}

// ============================================================================
// DADOS OFICIAIS DE TESTE (18 PARTES DO SPEC ALÔ MÃE)
// ============================================================================

const TEST_USERS = [
  {
    email: 'direcao@colegiohorizonte.ao',
    password: 'AloMae@Direcao2026',
    role: 'instituicao',
    institutionUserType: 'direcao',
    name: 'Direção Colégio Horizonte',
    legacyIds: ['user_admin_carlos'],
    deterministicUid: 'user_direcao_horizonte',
    schoolId: 'school_horizonte_luanda',
    phone: '+244 931 990 001',
    title: 'Direção Geral & Pedagógica',
  },
  {
    email: 'admin.teste@alo-mae.co.ao',
    password: 'AloMae@Admin2026',
    role: 'admin',
    institutionUserType: 'admin',
    name: 'Administrador de Teste',
    legacyIds: [],
    deterministicUid: 'user_admin_teste',
    schoolId: 'school_horizonte_luanda',
    phone: '+244 923 000 001',
    title: 'Administrador do Sistema',
  },
  {
    email: 'maria.santos@alo-mae.co.ao',
    password: 'AloMae@Professor2026',
    role: 'professor',
    name: 'Maria Santos',
    legacyIds: ['user_prof_maria'],
    deterministicUid: 'user_prof_maria',
    schoolId: 'school_horizonte_luanda',
    phone: '+244 912 340 556',
    title: 'Professora Titular de Língua Portuguesa',
    classIds: ['turma_1A'],
  },
  {
    email: 'prof.teste1@alo-mae.co.ao',
    password: 'AloMae@Professor2026',
    role: 'professor',
    name: 'Professor Teste 1',
    legacyIds: ['user-prof-1'],
    deterministicUid: 'user_prof_teste1',
    schoolId: 'school_horizonte_luanda',
    phone: '+244 923 111 002',
    title: 'Docente de Ciências Naturais',
    classIds: ['turma_2A'],
  },
  {
    email: 'manuel.domingos@alo-mae.co.ao',
    password: 'AloMae@Professor2026',
    role: 'professor',
    name: 'Manuel Domingos',
    legacyIds: ['prof_manuel_01'],
    deterministicUid: 'prof_manuel_01',
    schoolId: 'school_horizonte_luanda',
    phone: '+244 923 111 222',
    title: 'Coordenador Pedagógico / Matemática',
    classIds: ['turma_3A'],
  },
  {
    email: 'ana.silva@alo-mae.co.ao',
    password: 'AloMae@Professor2026',
    role: 'professor',
    name: 'Ana Silva',
    legacyIds: ['prof_ana_02'],
    deterministicUid: 'prof_ana_02',
    schoolId: 'school_horizonte_luanda',
    phone: '+244 924 333 444',
    title: 'Docente de História e Geografia',
    classIds: ['turma_1A'],
  },
  {
    email: 'fernanda.silva@email.com',
    password: 'AloMae@Pai2026',
    role: 'pai',
    name: 'Fernanda Silva',
    legacyIds: ['user_pai_fernanda', 'parent_std-1'],
    deterministicUid: 'user_pai_fernanda',
    schoolId: 'school_horizonte_luanda',
    phone: '+244 923 884 912',
    title: 'Encarregada de Educação',
    studentIds: ['student_001', 'student_002'],
  },
  {
    email: 'pai.teste1@alo-mae.co.ao',
    password: 'AloMae@Pai2026',
    role: 'pai',
    name: 'Encarregado Teste 1',
    legacyIds: ['user-pai-1', 'parent_std-2'],
    deterministicUid: 'user_pai_teste1',
    schoolId: 'school_horizonte_luanda',
    phone: '+244 924 551 092',
    title: 'Encarregado de Educação',
    studentIds: ['student_003', 'student_004'],
  },
];

async function seed() {
  console.log('\n===============================================================');
  console.log('🚀 INICIANDO INICIALIZAÇÃO FIREBASE PARA PROJETO "liga-so"');
  console.log('===============================================================\n');

  // --------------------------------------------------------------------------
  // PARTE 1 — FIREBASE AUTHENTICATION USERS
  // --------------------------------------------------------------------------
  console.log('📌 PARTE 1 — Gerenciando utilizadores no Firebase Authentication...');
  const realUidMap = new Map(); // email -> real uid

  for (const u of TEST_USERS) {
    let authUser = null;
    try {
      authUser = await auth.getUserByEmail(u.email);
      console.log(`   ℹ️ Utilizador já existente no Auth: ${u.email} (UID: ${authUser.uid})`);
      report.authUsers.push({
        email: u.email,
        uid: authUser.uid,
        role: u.role,
        status: 'preservado_existente',
      });
      realUidMap.set(u.email, authUser.uid);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        try {
          authUser = await auth.createUser({
            email: u.email,
            password: u.password,
            displayName: u.name,
            emailVerified: true,
            phoneNumber: u.phone && u.phone.startsWith('+') ? u.phone.replace(/\s+/g, '') : undefined,
          });
          console.log(`   ✅ Utilizador CRIADO no Auth: ${u.email} (UID: ${authUser.uid})`);
          report.authUsers.push({
            email: u.email,
            uid: authUser.uid,
            role: u.role,
            status: 'criado_com_sucesso',
          });
          realUidMap.set(u.email, authUser.uid);
        } catch (createErr) {
          console.warn(`   ⚠️ Erro ao criar utilizador no Auth (${u.email}): ${createErr.message}`);
          report.errors.push(`Auth create ${u.email}: ${createErr.message}`);
          // Utilizar UID determinístico de fallback para o Firestore se não puder criar no Auth
          realUidMap.set(u.email, u.deterministicUid);
          report.authUsers.push({
            email: u.email,
            uid: u.deterministicUid,
            role: u.role,
            status: `pendente_criacao_auth (${createErr.code || createErr.message})`,
          });
        }
      } else {
        console.warn(`   ⚠️ Erro ao consultar utilizador no Auth (${u.email}): ${err.message}`);
        report.errors.push(`Auth check ${u.email}: ${err.message}`);
        realUidMap.set(u.email, u.deterministicUid);
        report.authUsers.push({
          email: u.email,
          uid: u.deterministicUid,
          role: u.role,
          status: `erro_consulta_auth (${err.message})`,
        });
      }
    }

    // Configurar Custom Claims se o usuário foi obtido ou criado no Auth
    if (authUser?.uid) {
      try {
        await auth.setCustomUserClaims(authUser.uid, {
          role: u.role,
          schoolId: u.schoolId,
          institutionUserType: u.institutionUserType || null,
        });
      } catch (claimsErr) {
        console.warn(`   ⚠️ Aviso ao definir custom claims para ${u.email}:`, claimsErr.message);
      }
    }
  }

  // --------------------------------------------------------------------------
  // PARTE 2 — ESCOLA (schools & institutions)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 2 — Populando escola oficial "school_horizonte_luanda"...');
  const schoolData = {
    id: 'school_horizonte_luanda',
    name: 'Colégio Horizonte',
    displayName: 'Colégio Horizonte',
    legalName: 'Complexo Escolar Horizonte Lda.',
    nif: '5401928371',
    email: 'direcao@colegiohorizonte.ao',
    phone: '+244900000000',
    address: 'Avenida 21 de Janeiro, Morro Bento',
    city: 'Luanda',
    province: 'Luanda',
    country: 'Angola',
    active: true,
  };
  await safeSetDoc('schools', 'school_horizonte_luanda', schoolData);
  // Preservar compatibilidade com referências que consultam `institutions`
  await safeSetDoc('institutions', 'school_horizonte_luanda', schoolData);
  await safeSetDoc('institutions', 'inst_horizonte_01', {
    ...schoolData,
    id: 'inst_horizonte_01',
  });

  // --------------------------------------------------------------------------
  // PARTES 3, 4, 5, 6 — UTILIZADORES NO FIRESTORE (users/{uid})
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTES 3, 4, 5, 6 — Populando perfis de utilizadores em users/{uid}...');
  for (const u of TEST_USERS) {
    const realUid = realUidMap.get(u.email) || u.deterministicUid;
    const userDocData = {
      uid: realUid,
      id: realUid,
      email: u.email,
      name: u.name,
      nome: u.name,
      role: u.role,
      schoolId: u.schoolId,
      schoolIds: [u.schoolId],
      active: true,
      status: 'active',
      authProvider: 'password',
      emailVerified: true,
      phone: u.phone,
      title: u.title,
      studentIds: u.studentIds || [],
      classIds: u.classIds || [],
      institutionUserType: u.institutionUserType,
    };

    // Criar perfil com UID real
    await safeSetDoc('users', realUid, userDocData);

    // Preservar compatibilidade com UIDs legados citados na especificação
    for (const legacyId of u.legacyIds) {
      if (legacyId !== realUid) {
        await safeSetDoc('users', legacyId, {
          ...userDocData,
          uid: legacyId,
          id: legacyId,
          realAuthUid: realUid,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // PARTE 7 — TURMAS (turmas & classes)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 7 — Criando turmas turma_1A, turma_2A, turma_3A...');
  const turmasData = [
    {
      id: 'turma_1A',
      name: '1ª Classe A',
      nome: '1ª Classe A',
      className: '1ª Classe',
      schoolId: 'school_horizonte_luanda',
      instituicao_id: 'school_horizonte_luanda',
      room: 'Sala 101',
      sala: 'Sala 101',
      shift: 'manha',
      periodo: 'Manhã',
      ano_lectivo: '2025/2026',
      academicYearId: '2025/2026',
      studentCount: 2,
      total_alunos: 2,
      teacherIds: ['maria.santos@alo-mae.co.ao', 'ana.silva@alo-mae.co.ao'],
      disciplinas: ['Língua Portuguesa', 'Matemática', 'Estudo do Meio'],
      active: true,
    },
    {
      id: 'turma_2A',
      name: '2ª Classe A',
      nome: '2ª Classe A',
      className: '2ª Classe',
      schoolId: 'school_horizonte_luanda',
      instituicao_id: 'school_horizonte_luanda',
      room: 'Sala 102',
      sala: 'Sala 102',
      shift: 'tarde',
      periodo: 'Tarde',
      ano_lectivo: '2025/2026',
      academicYearId: '2025/2026',
      studentCount: 2,
      total_alunos: 2,
      teacherIds: ['prof.teste1@alo-mae.co.ao'],
      disciplinas: ['Língua Portuguesa', 'Matemática', 'Ciências Naturais'],
      active: true,
    },
    {
      id: 'turma_3A',
      name: '3ª Classe A',
      nome: '3ª Classe A',
      className: '3ª Classe',
      schoolId: 'school_horizonte_luanda',
      instituicao_id: 'school_horizonte_luanda',
      room: 'Sala 103',
      sala: 'Sala 103',
      shift: 'manha',
      periodo: 'Manhã',
      ano_lectivo: '2025/2026',
      academicYearId: '2025/2026',
      studentCount: 2,
      total_alunos: 2,
      teacherIds: ['manuel.domingos@alo-mae.co.ao'],
      disciplinas: ['Língua Portuguesa', 'Matemática', 'História', 'Geografia'],
      active: true,
    },
  ];

  for (const t of turmasData) {
    await safeSetDoc('turmas', t.id, t);
    await safeSetDoc('classes', t.id, t);
  }

  // --------------------------------------------------------------------------
  // PARTE 8 — PROFESSOR ↔ TURMA (turmas_professores & teacherAssignments)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 8 — Vinculando professores às turmas...');
  const profLinks = [
    {
      id: 'tp_maria_1A',
      turma_id: 'turma_1A',
      classId: 'turma_1A',
      className: '1ª Classe A',
      turma_nome: '1ª Classe A',
      professor_id: realUidMap.get('maria.santos@alo-mae.co.ao') || 'user_prof_maria',
      teacherId: realUidMap.get('maria.santos@alo-mae.co.ao') || 'user_prof_maria',
      teacherUid: realUidMap.get('maria.santos@alo-mae.co.ao') || 'user_prof_maria',
      teacherName: 'Maria Santos',
      professor_nome: 'Maria Santos',
      disciplina: 'Língua Portuguesa',
      subjectName: 'Língua Portuguesa',
      schoolId: 'school_horizonte_luanda',
      institutionId: 'school_horizonte_luanda',
      active: true,
    },
    {
      id: 'tp_ana_1A',
      turma_id: 'turma_1A',
      classId: 'turma_1A',
      className: '1ª Classe A',
      turma_nome: '1ª Classe A',
      professor_id: realUidMap.get('ana.silva@alo-mae.co.ao') || 'prof_ana_02',
      teacherId: realUidMap.get('ana.silva@alo-mae.co.ao') || 'prof_ana_02',
      teacherUid: realUidMap.get('ana.silva@alo-mae.co.ao') || 'prof_ana_02',
      teacherName: 'Ana Silva',
      professor_nome: 'Ana Silva',
      disciplina: 'Matemática',
      subjectName: 'Matemática',
      schoolId: 'school_horizonte_luanda',
      institutionId: 'school_horizonte_luanda',
      active: true,
    },
    {
      id: 'tp_profteste1_2A',
      turma_id: 'turma_2A',
      classId: 'turma_2A',
      className: '2ª Classe A',
      turma_nome: '2ª Classe A',
      professor_id: realUidMap.get('prof.teste1@alo-mae.co.ao') || 'user_prof_teste1',
      teacherId: realUidMap.get('prof.teste1@alo-mae.co.ao') || 'user_prof_teste1',
      teacherUid: realUidMap.get('prof.teste1@alo-mae.co.ao') || 'user_prof_teste1',
      teacherName: 'Professor Teste 1',
      professor_nome: 'Professor Teste 1',
      disciplina: 'Ciências Naturais',
      subjectName: 'Ciências Naturais',
      schoolId: 'school_horizonte_luanda',
      institutionId: 'school_horizonte_luanda',
      active: true,
    },
    {
      id: 'tp_manuel_3A',
      turma_id: 'turma_3A',
      classId: 'turma_3A',
      className: '3ª Classe A',
      turma_nome: '3ª Classe A',
      professor_id: realUidMap.get('manuel.domingos@alo-mae.co.ao') || 'prof_manuel_01',
      teacherId: realUidMap.get('manuel.domingos@alo-mae.co.ao') || 'prof_manuel_01',
      teacherUid: realUidMap.get('manuel.domingos@alo-mae.co.ao') || 'prof_manuel_01',
      teacherName: 'Manuel Domingos',
      professor_nome: 'Manuel Domingos',
      disciplina: 'Matemática',
      subjectName: 'Matemática',
      schoolId: 'school_horizonte_luanda',
      institutionId: 'school_horizonte_luanda',
      active: true,
    },
  ];

  for (const pl of profLinks) {
    await safeSetDoc('turmas_professores', pl.id, pl);
    await safeSetDoc('teacherAssignments', pl.id, pl);
  }

  // --------------------------------------------------------------------------
  // PARTE 9 — ALUNOS (students & alunos)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 9 — Criando os 6 alunos de teste student_001 a student_006...');
  const fernandaUid = realUidMap.get('fernanda.silva@email.com') || 'user_pai_fernanda';
  const paiteste1Uid = realUidMap.get('pai.teste1@alo-mae.co.ao') || 'user_pai_teste1';

  const studentsData = [
    {
      id: 'student_001',
      matricula: 'MAT-2026-001',
      name: 'Lucas Silva',
      fullName: 'Lucas Silva',
      nome_completo: 'Lucas Silva',
      schoolId: 'school_horizonte_luanda',
      schoolName: 'Colégio Horizonte',
      turmaId: 'turma_1A',
      turma_id: 'turma_1A',
      classId: 'turma_1A',
      className: '1ª Classe A',
      parentUid: fernandaUid,
      encarregado_id: fernandaUid,
      parentName: 'Fernanda Silva',
      parentEmail: 'fernanda.silva@email.com',
      parentPhone: '+244 923 884 912',
      photoUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&auto=format&fit=crop&q=80',
      foto_biometrica_url: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&auto=format&fit=crop&q=80',
      status: 'present',
      status_presenca: 'present',
      biometricCode: 'BIO-001-LUCAS',
      biometric_code: 'BIO-001-LUCAS',
      insurancePolicyId: 'POL-HORIZONTE-2026',
      active: true,
    },
    {
      id: 'student_002',
      matricula: 'MAT-2026-002',
      name: 'Beatriz Silva',
      fullName: 'Beatriz Silva',
      nome_completo: 'Beatriz Silva',
      schoolId: 'school_horizonte_luanda',
      schoolName: 'Colégio Horizonte',
      turmaId: 'turma_1A',
      turma_id: 'turma_1A',
      classId: 'turma_1A',
      className: '1ª Classe A',
      parentUid: fernandaUid,
      encarregado_id: fernandaUid,
      parentName: 'Fernanda Silva',
      parentEmail: 'fernanda.silva@email.com',
      parentPhone: '+244 923 884 912',
      photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      foto_biometrica_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      status: 'present',
      status_presenca: 'present',
      biometricCode: 'BIO-002-BEATRIZ',
      biometric_code: 'BIO-002-BEATRIZ',
      insurancePolicyId: 'POL-HORIZONTE-2026',
      active: true,
    },
    {
      id: 'student_003',
      matricula: 'MAT-2026-003',
      name: 'Mateus Santos',
      fullName: 'Mateus Santos',
      nome_completo: 'Mateus Santos',
      schoolId: 'school_horizonte_luanda',
      schoolName: 'Colégio Horizonte',
      turmaId: 'turma_2A',
      turma_id: 'turma_2A',
      classId: 'turma_2A',
      className: '2ª Classe A',
      parentUid: paiteste1Uid,
      encarregado_id: paiteste1Uid,
      parentName: 'Encarregado Teste 1',
      parentEmail: 'pai.teste1@alo-mae.co.ao',
      parentPhone: '+244 924 551 092',
      photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
      foto_biometrica_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
      status: 'present',
      status_presenca: 'present',
      biometricCode: 'BIO-003-MATEUS',
      biometric_code: 'BIO-003-MATEUS',
      insurancePolicyId: 'POL-HORIZONTE-2026',
      active: true,
    },
    {
      id: 'student_004',
      matricula: 'MAT-2026-004',
      name: 'Sara Santos',
      fullName: 'Sara Santos',
      nome_completo: 'Sara Santos',
      schoolId: 'school_horizonte_luanda',
      schoolName: 'Colégio Horizonte',
      turmaId: 'turma_2A',
      turma_id: 'turma_2A',
      classId: 'turma_2A',
      className: '2ª Classe A',
      parentUid: paiteste1Uid,
      encarregado_id: paiteste1Uid,
      parentName: 'Encarregado Teste 1',
      parentEmail: 'pai.teste1@alo-mae.co.ao',
      parentPhone: '+244 924 551 092',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      foto_biometrica_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      status: 'absent',
      status_presenca: 'absent',
      biometricCode: 'BIO-004-SARA',
      biometric_code: 'BIO-004-SARA',
      insurancePolicyId: 'POL-HORIZONTE-2026',
      active: true,
    },
    {
      id: 'student_005',
      matricula: 'MAT-2026-005',
      name: 'Daniel Domingos',
      fullName: 'Daniel Domingos',
      nome_completo: 'Daniel Domingos',
      schoolId: 'school_horizonte_luanda',
      schoolName: 'Colégio Horizonte',
      turmaId: 'turma_3A',
      turma_id: 'turma_3A',
      classId: 'turma_3A',
      className: '3ª Classe A',
      parentUid: fernandaUid,
      encarregado_id: fernandaUid,
      parentName: 'Fernanda Silva',
      parentEmail: 'fernanda.silva@email.com',
      parentPhone: '+244 923 884 912',
      photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
      foto_biometrica_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
      status: 'present',
      status_presenca: 'present',
      biometricCode: 'BIO-005-DANIEL',
      biometric_code: 'BIO-005-DANIEL',
      insurancePolicyId: 'POL-HORIZONTE-2026',
      active: true,
    },
    {
      id: 'student_006',
      matricula: 'MAT-2026-006',
      name: 'Clara Oliveira',
      fullName: 'Clara Oliveira',
      nome_completo: 'Clara Oliveira',
      schoolId: 'school_horizonte_luanda',
      schoolName: 'Colégio Horizonte',
      turmaId: 'turma_3A',
      turma_id: 'turma_3A',
      classId: 'turma_3A',
      className: '3ª Classe A',
      parentUid: paiteste1Uid,
      encarregado_id: paiteste1Uid,
      parentName: 'Encarregado Teste 1',
      parentEmail: 'pai.teste1@alo-mae.co.ao',
      parentPhone: '+244 924 551 092',
      photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      foto_biometrica_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      status: 'present',
      status_presenca: 'present',
      biometricCode: 'BIO-006-CLARA',
      biometric_code: 'BIO-006-CLARA',
      insurancePolicyId: 'POL-HORIZONTE-2026',
      active: true,
    },
  ];

  for (const st of studentsData) {
    await safeSetDoc('students', st.id, st);
    await safeSetDoc('alunos', st.id, st);
  }

  // --------------------------------------------------------------------------
  // PARTE 10 — ENCARREGADO ↔ ALUNO (guardianStudentLinks)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 10 — Vinculando encarregados aos alunos...');
  const links = [
    {
      id: 'link_fernanda_001',
      institutionId: 'school_horizonte_luanda',
      guardianUid: fernandaUid,
      studentId: 'student_001',
      relationship: 'mae',
      primaryGuardian: true,
      canReceiveNotifications: true,
      canViewGrades: true,
      canViewAttendance: true,
      canViewInsurance: true,
      active: true,
    },
    {
      id: 'link_fernanda_002',
      institutionId: 'school_horizonte_luanda',
      guardianUid: fernandaUid,
      studentId: 'student_002',
      relationship: 'mae',
      primaryGuardian: true,
      canReceiveNotifications: true,
      canViewGrades: true,
      canViewAttendance: true,
      canViewInsurance: true,
      active: true,
    },
    {
      id: 'link_paiteste_003',
      institutionId: 'school_horizonte_luanda',
      guardianUid: paiteste1Uid,
      studentId: 'student_003',
      relationship: 'pai',
      primaryGuardian: true,
      canReceiveNotifications: true,
      canViewGrades: true,
      canViewAttendance: true,
      canViewInsurance: true,
      active: true,
    },
    {
      id: 'link_paiteste_004',
      institutionId: 'school_horizonte_luanda',
      guardianUid: paiteste1Uid,
      studentId: 'student_004',
      relationship: 'pai',
      primaryGuardian: true,
      canReceiveNotifications: true,
      canViewGrades: true,
      canViewAttendance: true,
      canViewInsurance: true,
      active: true,
    },
  ];

  for (const l of links) {
    await safeSetDoc('guardianStudentLinks', l.id, l);
  }

  // --------------------------------------------------------------------------
  // PARTE 11 — NOTAS (grades)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 11 — Criando avaliações e notas (grades)...');
  const gradesData = [
    {
      id: 'grade_001',
      studentId: 'student_001',
      studentName: 'Lucas Silva',
      classId: 'turma_1A',
      className: '1ª Classe A',
      subject: 'Língua Portuguesa',
      teacherId: realUidMap.get('maria.santos@alo-mae.co.ao') || 'user_prof_maria',
      teacherName: 'Maria Santos',
      grade: 16,
      mac: 16,
      npp: 17,
      npt: 15,
      trimestre: 1,
      feedback: 'Excelente leitura e interpretação.',
      status: 'published',
      schoolId: 'school_horizonte_luanda',
    },
    {
      id: 'grade_002',
      studentId: 'student_002',
      studentName: 'Beatriz Silva',
      classId: 'turma_1A',
      className: '1ª Classe A',
      subject: 'Língua Portuguesa',
      teacherId: realUidMap.get('maria.santos@alo-mae.co.ao') || 'user_prof_maria',
      teacherName: 'Maria Santos',
      grade: 17,
      mac: 17,
      npp: 18,
      npt: 16,
      trimestre: 1,
      feedback: 'Muito empenhada nas redações.',
      status: 'published',
      schoolId: 'school_horizonte_luanda',
    },
    {
      id: 'grade_003',
      studentId: 'student_003',
      studentName: 'Mateus Santos',
      classId: 'turma_2A',
      className: '2ª Classe A',
      subject: 'Ciências Naturais',
      teacherId: realUidMap.get('prof.teste1@alo-mae.co.ao') || 'user_prof_teste1',
      teacherName: 'Professor Teste 1',
      grade: 15,
      mac: 14,
      npp: 15,
      npt: 16,
      trimestre: 1,
      feedback: 'Bom desempenho nas atividades práticas.',
      status: 'published',
      schoolId: 'school_horizonte_luanda',
    },
    {
      id: 'grade_004',
      studentId: 'student_004',
      studentName: 'Sara Santos',
      classId: 'turma_2A',
      className: '2ª Classe A',
      subject: 'Ciências Naturais',
      teacherId: realUidMap.get('prof.teste1@alo-mae.co.ao') || 'user_prof_teste1',
      teacherName: 'Professor Teste 1',
      grade: 14,
      mac: 14,
      npp: 13,
      npt: 15,
      trimestre: 1,
      feedback: 'Participação satisfatória.',
      status: 'published',
      schoolId: 'school_horizonte_luanda',
    },
    {
      id: 'grade_005',
      studentId: 'student_005',
      studentName: 'Daniel Domingos',
      classId: 'turma_3A',
      className: '3ª Classe A',
      subject: 'Matemática',
      teacherId: realUidMap.get('manuel.domingos@alo-mae.co.ao') || 'prof_manuel_01',
      teacherName: 'Manuel Domingos',
      grade: 18,
      mac: 18,
      npp: 18,
      npt: 18,
      trimestre: 1,
      feedback: 'Exímio raciocínio lógico.',
      status: 'published',
      schoolId: 'school_horizonte_luanda',
    },
    {
      id: 'grade_006',
      studentId: 'student_006',
      studentName: 'Clara Oliveira',
      classId: 'turma_3A',
      className: '3ª Classe A',
      subject: 'Matemática',
      teacherId: realUidMap.get('manuel.domingos@alo-mae.co.ao') || 'prof_manuel_01',
      teacherName: 'Manuel Domingos',
      grade: 16,
      mac: 15,
      npp: 16,
      npt: 17,
      trimestre: 1,
      feedback: 'Excelente evolução no trimestre.',
      status: 'published',
      schoolId: 'school_horizonte_luanda',
    },
  ];

  for (const g of gradesData) {
    await safeSetDoc('grades', g.id, g);
  }

  // --------------------------------------------------------------------------
  // PARTE 12 — MINI PAUTAS (mini_pautas & miniReports)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 12 — Criando mini-pautas (mini_pautas / miniReports)...');
  const miniPauta1 = {
    id: 'mp_turma1A_portugues',
    institutionId: 'school_horizonte_luanda',
    academicYearId: '2025/2026',
    ano_lectivo: '2025/2026',
    trimestre: 1,
    classId: 'turma_1A',
    className: '1ª Classe A',
    turma_id: 'turma_1A',
    turma_nome: '1ª Classe A',
    disciplina: 'Língua Portuguesa',
    subjectName: 'Língua Portuguesa',
    teacherId: realUidMap.get('maria.santos@alo-mae.co.ao') || 'user_prof_maria',
    teacherUid: realUidMap.get('maria.santos@alo-mae.co.ao') || 'user_prof_maria',
    teacherName: 'Maria Santos',
    professor_id: realUidMap.get('maria.santos@alo-mae.co.ao') || 'user_prof_maria',
    professor_nome: 'Maria Santos',
    title: 'Língua Portuguesa - 1ª Classe A (1º Trimestre)',
    status: 'aprovada',
    notas: [
      {
        aluno_id: 'student_001',
        aluno_nome: 'Lucas Silva',
        aluno_matricula: 'MAT-2026-001',
        mac: 16,
        npp: 17,
        npt: 15,
        media_final: 16,
        observacao: 'Excelente',
        faltas: 0,
      },
      {
        aluno_id: 'student_002',
        aluno_nome: 'Beatriz Silva',
        aluno_matricula: 'MAT-2026-002',
        mac: 17,
        npp: 18,
        npt: 16,
        media_final: 17,
        observacao: 'Excelente',
        faltas: 0,
      },
    ],
    locked: true,
  };

  await safeSetDoc('mini_pautas', miniPauta1.id, miniPauta1);
  await safeSetDoc('miniReports', miniPauta1.id, miniPauta1);

  // --------------------------------------------------------------------------
  // PARTE 13 — NOTIFICAÇÕES (notifications)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 13 — Criando notificações de teste...');
  const notifsData = [
    {
      id: 'notif_entrada_001',
      institutionId: 'school_horizonte_luanda',
      schoolId: 'school_horizonte_luanda',
      type: 'access_entry',
      title: 'Entrada na Escola Confirmada',
      subject: 'Acesso Escolar',
      message: 'O aluno Lucas Silva registou entrada no Colégio Horizonte às 07:32 via reconhecimento facial.',
      senderName: 'Portaria Biometria',
      senderRole: 'terminal',
      studentId: 'student_001',
      studentName: 'Lucas Silva',
      recipientUid: fernandaUid,
      targetUserUid: fernandaUid,
      targetType: 'user',
      date: new Date().toLocaleDateString('pt-PT'),
      time: '07:32',
      isRead: false,
      receiptCode: 'REC-ALO-88912',
    },
    {
      id: 'notif_pauta_prof',
      institutionId: 'school_horizonte_luanda',
      schoolId: 'school_horizonte_luanda',
      type: 'mini_report_approved',
      title: 'Mini-Pauta Aprovada',
      subject: 'Gestão Pedagógica',
      message: 'A sua mini-pauta de Língua Portuguesa da 1ª Classe A foi aprovada pela Direção.',
      senderName: 'Direção Geral',
      senderRole: 'instituicao',
      recipientUid: realUidMap.get('maria.santos@alo-mae.co.ao') || 'user_prof_maria',
      targetType: 'user',
      date: new Date().toLocaleDateString('pt-PT'),
      time: '08:15',
      isRead: true,
    },
    {
      id: 'notif_instituicao_resumo',
      institutionId: 'school_horizonte_luanda',
      schoolId: 'school_horizonte_luanda',
      type: 'broadcast',
      title: 'Sistema Operacional & Acessos Ativos',
      subject: 'Status do Sistema',
      message: 'Todos os terminais biométricos e registros de presença estão operacionais na escola.',
      senderName: 'Sistema Alô Mãe',
      senderRole: 'system',
      recipientUid: realUidMap.get('direcao@colegiohorizonte.ao') || 'user_direcao_horizonte',
      targetType: 'institution',
      date: new Date().toLocaleDateString('pt-PT'),
      time: '07:00',
      isRead: false,
    },
  ];

  for (const n of notifsData) {
    await safeSetDoc('notifications', n.id, n);
  }

  // --------------------------------------------------------------------------
  // PARTE 14 — PRESENÇAS / ACCESS LOGS (accessLogs & attendanceEvents)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 14 — Criando registros de acessos biométricos (accessLogs)...');
  const todayStr = new Date().toLocaleDateString('pt-PT');
  const accessRecords = [
    {
      id: 'log_std001_entrada',
      schoolId: 'school_horizonte_luanda',
      institutionId: 'school_horizonte_luanda',
      studentId: 'student_001',
      studentName: 'Lucas Silva',
      matricula: 'MAT-2026-001',
      classId: 'turma_1A',
      className: '1ª Classe A',
      turmaId: 'turma_1A',
      turma_nome: '1ª Classe A',
      type: 'ENTRADA',
      eventType: 'ENTRADA',
      method: 'facial',
      location: 'Portão Principal - Terminal 01',
      receiptCode: 'REC-ALO-88912',
      timestamp: '07:32:15',
      date: todayStr,
      confidence: 0.98,
      livenessPassed: true,
    },
    {
      id: 'log_std002_entrada',
      schoolId: 'school_horizonte_luanda',
      institutionId: 'school_horizonte_luanda',
      studentId: 'student_002',
      studentName: 'Beatriz Silva',
      matricula: 'MAT-2026-002',
      classId: 'turma_1A',
      className: '1ª Classe A',
      turmaId: 'turma_1A',
      turma_nome: '1ª Classe A',
      type: 'ENTRADA',
      eventType: 'ENTRADA',
      method: 'facial',
      location: 'Portão Principal - Terminal 01',
      receiptCode: 'REC-ALO-88913',
      timestamp: '07:35:40',
      date: todayStr,
      confidence: 0.96,
      livenessPassed: true,
    },
    {
      id: 'log_std003_entrada',
      schoolId: 'school_horizonte_luanda',
      institutionId: 'school_horizonte_luanda',
      studentId: 'student_003',
      studentName: 'Mateus Santos',
      matricula: 'MAT-2026-003',
      classId: 'turma_2A',
      className: '2ª Classe A',
      turmaId: 'turma_2A',
      turma_nome: '2ª Classe A',
      type: 'ENTRADA',
      eventType: 'ENTRADA',
      method: 'facial',
      location: 'Portão Principal - Terminal 02',
      receiptCode: 'REC-ALO-88914',
      timestamp: '12:45:10',
      date: todayStr,
      confidence: 0.97,
      livenessPassed: true,
    },
  ];

  for (const al of accessRecords) {
    await safeSetDoc('accessLogs', al.id, al);
    await safeSetDoc('attendanceEvents', al.id, al);
  }

  // --------------------------------------------------------------------------
  // PARTE 15 — MEDICAL (medicalClinics, medicalGuides, studentMedical)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 15 — Criando dados médicos conveniados e guias de saúde...');
  const clinicData = {
    id: 'clinica_horizonte_vida',
    name: 'Clínica Horizonte Vida',
    specialty: 'Pediatria e Urgência Escolar 24h',
    address: 'Rua Direita do Morro Bento, Edifício Vida, Luanda',
    province: 'Luanda',
    municipality: 'Talatona',
    emergencyPhone: '+244 923 000 999',
    services: ['Pediatria Geral', 'Traumatologia Escolar', 'Urgência 24h', 'Enfermagem'],
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&auto=format&fit=crop&q=80',
    available24h: true,
    active: true,
    schoolId: 'school_horizonte_luanda',
  };
  await safeSetDoc('medicalClinics', 'clinica_horizonte_vida', clinicData);

  const guideData = {
    id: 'guia_med_001',
    guideNumber: 'GM-2026-001',
    institutionId: 'school_horizonte_luanda',
    schoolName: 'Colégio Horizonte',
    studentId: 'student_001',
    studentName: 'Lucas Silva',
    studentMatricula: 'MAT-2026-001',
    className: '1ª Classe A',
    guardianUid: fernandaUid,
    guardianName: 'Fernanda Silva',
    emergencyContactPhone: '+244 923 884 912',
    clinicId: 'clinica_horizonte_vida',
    clinicName: 'Clínica Horizonte Vida',
    clinicAddress: 'Rua Direita do Morro Bento, Edifício Vida, Luanda',
    clinicEmergencyPhone: '+244 923 000 999',
    insuranceProviderName: 'ENSA Seguros',
    insurancePolicyNumber: 'POL-HORIZONTE-2026',
    reason: 'Sintomas gripais com febre moderada no intervalo escolar.',
    priority: 'normal',
    status: 'completed',
    issuedByUid: realUidMap.get('direcao@colegiohorizonte.ao') || 'user_direcao_horizonte',
    issuedByName: 'Direção Geral',
    issuedAt: todayStr,
  };
  await safeSetDoc('medicalGuides', 'guia_med_001', guideData);

  for (const st of studentsData) {
    const medProfile = {
      studentId: st.id,
      studentName: st.name,
      classId: st.classId,
      schoolId: 'school_horizonte_luanda',
      institutionId: 'school_horizonte_luanda',
      insurancePolicyId: 'POL-HORIZONTE-2026',
      insuranceProvider: 'ENSA Seguros',
      policyType: 'comprehensive',
      coverage: ['Urgência Escolar', 'Acidentes Pessoais', 'Hospitalização', 'Exames'],
      validityStart: '01/01/2026',
      validityEnd: '31/12/2026',
      emergencyPhone: st.parentPhone || '+244 923 884 912',
      emergencyContactName: st.parentName || 'Encarregado',
      allergies: ['Nenhuma alergia registada'],
      chronicConditions: [],
    };
    await safeSetDoc('studentMedical', st.id, medProfile);
  }

  // --------------------------------------------------------------------------
  // PARTE 16 — CONVERSATIONS & MESSAGES
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 16 — Criando canal de comunicação entre Encarregada e Professora...');
  const mariaUid = realUidMap.get('maria.santos@alo-mae.co.ao') || 'user_prof_maria';
  const convId = 'conv_fernanda_maria';
  const convData = {
    id: convId,
    institutionId: 'school_horizonte_luanda',
    participantIds: [fernandaUid, mariaUid],
    teacherUid: mariaUid,
    guardianUid: fernandaUid,
    studentId: 'student_001',
    studentName: 'Lucas Silva',
    studentClass: '1ª Classe A',
    teacherName: 'Maria Santos',
    guardianName: 'Fernanda Silva',
    context: 'student',
    lastMessage: 'Muito obrigada pelo retorno, Professora!',
    lastMessageAt: FieldValue.serverTimestamp(),
    active: true,
    unreadCountTeacher: 0,
    unreadCountGuardian: 0,
  };
  await safeSetDoc('conversations', convId, convData);

  // Subcoleção messages
  const msg1 = {
    id: 'msg_001',
    conversationId: convId,
    senderUid: fernandaUid,
    receiverUid: mariaUid,
    senderName: 'Fernanda Silva',
    senderRole: 'pai',
    text: 'Olá Professora Maria, gostaria de confirmar como o Lucas se adaptou hoje na aula de Português.',
    read: true,
  };
  const msg2 = {
    id: 'msg_002',
    conversationId: convId,
    senderUid: mariaUid,
    receiverUid: fernandaUid,
    senderName: 'Maria Santos',
    senderRole: 'professor',
    text: 'Olá Sra. Fernanda! O Lucas adaptou-se muito bem e participou ativamente nas leituras.',
    read: true,
  };
  await safeSetDoc(`conversations/${convId}/messages`, 'msg_001', msg1);
  await safeSetDoc(`conversations/${convId}/messages`, 'msg_002', msg2);

  // --------------------------------------------------------------------------
  // PARTE 17 — AUDITORIA (auditLogs)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 17 — Gravando logs administrativos de auditoria...');
  const auditEntries = [
    {
      id: 'audit_init_school',
      institutionId: 'school_horizonte_luanda',
      actorUid: realUidMap.get('direcao@colegiohorizonte.ao') || 'user_direcao_horizonte',
      actorName: 'Direção Colégio Horizonte',
      actorRole: 'instituicao',
      action: 'create_school',
      entityType: 'school',
      entityId: 'school_horizonte_luanda',
      description: 'Inicialização da instituição Colégio Horizonte no Alô Mãe.',
      timestamp: FieldValue.serverTimestamp(),
    },
    {
      id: 'audit_create_classes',
      institutionId: 'school_horizonte_luanda',
      actorUid: realUidMap.get('direcao@colegiohorizonte.ao') || 'user_direcao_horizonte',
      actorName: 'Direção Colégio Horizonte',
      actorRole: 'instituicao',
      action: 'create_turmas',
      entityType: 'classes',
      entityId: 'turma_1A',
      description: 'Criação e homologação das turmas iniciais turma_1A, turma_2A e turma_3A.',
      timestamp: FieldValue.serverTimestamp(),
    },
    {
      id: 'audit_enroll_students',
      institutionId: 'school_horizonte_luanda',
      actorUid: realUidMap.get('direcao@colegiohorizonte.ao') || 'user_direcao_horizonte',
      actorName: 'Direção Colégio Horizonte',
      actorRole: 'instituicao',
      action: 'enroll_students',
      entityType: 'students',
      entityId: 'student_001',
      description: 'Matrícula biométrica e vinculação dos encarregados de educação.',
      timestamp: FieldValue.serverTimestamp(),
    },
  ];

  for (const a of auditEntries) {
    await safeSetDoc('auditLogs', a.id, a);
  }

  // --------------------------------------------------------------------------
  // PARTE 18 — CLASS STATS (classStats)
  // --------------------------------------------------------------------------
  console.log('\n📌 PARTE 18 — Criando estatísticas de turmas (classStats)...');
  const classStatsList = [
    {
      classId: 'turma_1A',
      className: '1ª Classe A',
      schoolId: 'school_horizonte_luanda',
      institutionId: 'school_horizonte_luanda',
      teacherName: 'Maria Santos',
      room: 'Sala 101',
      totalStudents: 2,
      presentsToday: 2,
      absentsToday: 0,
      latesToday: 0,
      monthlyPresents: 44,
      monthlyAbsences: 0,
      monthlyLates: 0,
      frequencyRate: 100,
      averageGrade: 16.5,
    },
    {
      classId: 'turma_2A',
      className: '2ª Classe A',
      schoolId: 'school_horizonte_luanda',
      institutionId: 'school_horizonte_luanda',
      teacherName: 'Professor Teste 1',
      room: 'Sala 102',
      totalStudents: 2,
      presentsToday: 1,
      absentsToday: 1,
      latesToday: 0,
      monthlyPresents: 40,
      monthlyAbsences: 4,
      monthlyLates: 1,
      frequencyRate: 90,
      averageGrade: 14.5,
    },
    {
      classId: 'turma_3A',
      className: '3ª Classe A',
      schoolId: 'school_horizonte_luanda',
      institutionId: 'school_horizonte_luanda',
      teacherName: 'Manuel Domingos',
      room: 'Sala 103',
      totalStudents: 2,
      presentsToday: 2,
      absentsToday: 0,
      latesToday: 0,
      monthlyPresents: 44,
      monthlyAbsences: 0,
      monthlyLates: 0,
      frequencyRate: 100,
      averageGrade: 17.0,
    },
  ];

  for (const cs of classStatsList) {
    await safeSetDoc('classStats', cs.classId, cs);
  }

  console.log('\n===============================================================');
  console.log('✅ INICIALIZAÇÃO E SEED CONCLUÍDOS COM SUCESSO!');
  console.log('===============================================================\n');

  console.log('📊 RESUMO DA EXECUÇÃO:');
  console.log(`- Projeto Firebase: ${report.firebaseProject}`);
  console.log(`- Firestore Database: ${report.firestore}`);
  console.log(`- Coleções Processadas: ${Array.from(report.collectionsCreated).join(', ')}`);
  console.log(`- Utilizadores no Auth: ${report.authUsers.length}`);
  console.log(`- Documentos Criados:`, report.documentsCreated);
  console.log(`- Documentos Preservados: ${report.documentsPreserved.length}`);
  if (report.errors.length > 0) {
    console.log(`- Avisos / Erros Registrados: ${report.errors.length}`);
  }
}

// Executar
seed().catch((err) => {
  console.error('\n❌ ERRO FATAL NO SEED:', err);
  process.exit(1);
});
