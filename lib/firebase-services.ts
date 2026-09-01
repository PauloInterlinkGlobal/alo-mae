import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { db, auth } from './firebase';
import {
  UserProfile,
  Aluno,
  Turma,
  TurmaProfessor,
  MiniPauta,
  NotaAluno,
  PresencaBiometrica,
  GuiaMedica,
} from './types';

// ==========================================================
// 1. Error Handling Standard (Firebase Integration Skill)
// ==========================================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==========================================================
// 2. Serviço de Autenticação & Perfis (`users`)
// ==========================================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: snap.id,
      nome: data.nome || data.name || '',
      email: data.email || '',
      telefone: data.telefone || data.phone || '',
      role: data.role || 'encarregado',
      criado_em: data.criado_em ? (data.criado_em.toDate ? data.criado_em.toDate().toISOString() : data.criado_em) : new Date().toISOString(),
      avatarUrl: data.avatarUrl || data.fotoUrl,
      instituicao_id: data.instituicao_id || data.schoolId,
      escola_nome: data.escola_nome || data.schoolName,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), {
      ...profile,
      criado_em: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================================
// 3. Serviço de Alunos & Guia Médica (`alunos`)
// ==========================================================

export async function getAlunos(turmaId?: string): Promise<Aluno[]> {
  const path = 'alunos';
  try {
    const q = turmaId
      ? query(collection(db, path), where('turma_id', '==', turmaId))
      : query(collection(db, path));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Aluno, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getAlunosDoEncarregado(encarregadoId: string): Promise<Aluno[]> {
  const path = 'alunos';
  try {
    const q = query(collection(db, path), where('encarregado_id', '==', encarregadoId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Aluno, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getAlunoById(alunoId: string): Promise<Aluno | null> {
  const path = `alunos/${alunoId}`;
  try {
    const snap = await getDoc(doc(db, 'alunos', alunoId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Aluno, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function updateGuiaMedica(alunoId: string, guia: GuiaMedica): Promise<void> {
  const path = `alunos/${alunoId}`;
  try {
    await updateDoc(doc(db, 'alunos', alunoId), {
      guia_medica: guia,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createAluno(aluno: Aluno): Promise<void> {
  const path = `alunos/${aluno.id}`;
  try {
    await setDoc(doc(db, 'alunos', aluno.id), aluno);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ==========================================================
// 4. Serviço de Turmas & Associação (`turmas`, `turmas_professores`)
// ==========================================================

export async function getTurmas(instituicaoId?: string): Promise<Turma[]> {
  const path = 'turmas';
  try {
    const q = instituicaoId
      ? query(collection(db, path), where('instituicao_id', '==', instituicaoId))
      : query(collection(db, path));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Turma, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getTurmasProfessores(professorId?: string): Promise<TurmaProfessor[]> {
  const path = 'turmas_professores';
  try {
    const q = professorId
      ? query(collection(db, path), where('professor_id', '==', professorId))
      : query(collection(db, path));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TurmaProfessor, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// ==========================================================
// 5. Serviço de Mini Pautas (`mini_pautas`)
// ==========================================================

export async function getMiniPautas(filters?: {
  professorId?: string;
  turmaId?: string;
  status?: string;
}): Promise<MiniPauta[]> {
  const path = 'mini_pautas';
  try {
    let q = query(collection(db, path));
    if (filters?.professorId) {
      q = query(q, where('professor_id', '==', filters.professorId));
    }
    if (filters?.turmaId) {
      q = query(q, where('turma_id', '==', filters.turmaId));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<MiniPauta, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getMiniPautasAprovadasPorTurma(turmaId: string): Promise<MiniPauta[]> {
  const path = 'mini_pautas';
  try {
    const q = query(
      collection(db, path),
      where('turma_id', '==', turmaId),
      where('status', '==', 'aprovada')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MiniPauta, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getMiniPautasAprovadasPorAluno(alunoId: string): Promise<{ pauta: MiniPauta; nota: NotaAluno }[]> {
  const path = 'mini_pautas';
  try {
    const q = query(collection(db, path), where('status', '==', 'aprovada'));
    const snap = await getDocs(q);
    const results: { pauta: MiniPauta; nota: NotaAluno }[] = [];

    snap.docs.forEach((docSnap) => {
      const pauta = { id: docSnap.id, ...(docSnap.data() as Omit<MiniPauta, 'id'>) };
      const alunoNota = pauta.notas?.find((n) => n.aluno_id === alunoId);
      if (alunoNota) {
        results.push({ pauta, nota: alunoNota });
      }
    });

    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function criarMiniPauta(pauta: Omit<MiniPauta, 'id' | 'status'> & { status?: 'rascunho' }): Promise<string> {
  const pautaId = `pauta_${pauta.turma_id}_${pauta.disciplina.toLowerCase().replace(/\s+/g, '_')}_t${pauta.trimestre}`;
  const path = `mini_pautas/${pautaId}`;
  try {
    const payload: MiniPauta = {
      id: pautaId,
      ...pauta,
      status: 'rascunho',
    };
    await setDoc(doc(db, 'mini_pautas', pautaId), payload);
    return pautaId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function salvarNotasMiniPauta(pautaId: string, notas: NotaAluno[]): Promise<void> {
  const path = `mini_pautas/${pautaId}`;
  try {
    await updateDoc(doc(db, 'mini_pautas', pautaId), {
      notas,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function submeterMiniPauta(pautaId: string): Promise<void> {
  const path = `mini_pautas/${pautaId}`;
  try {
    await updateDoc(doc(db, 'mini_pautas', pautaId), {
      status: 'submetida',
      data_envio: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function aprovarMiniPauta(pautaId: string): Promise<void> {
  const path = `mini_pautas/${pautaId}`;
  try {
    await updateDoc(doc(db, 'mini_pautas', pautaId), {
      status: 'aprovada',
      data_aprovacao: new Date().toISOString(),
      motivo_rejeicao: null,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function rejeitarMiniPauta(pautaId: string, motivo?: string): Promise<void> {
  const path = `mini_pautas/${pautaId}`;
  try {
    await updateDoc(doc(db, 'mini_pautas', pautaId), {
      status: 'rejeitada',
      motivo_rejeicao: motivo || 'Ajustar notas lançadas conforme critério pedagógico.',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function excluirMiniPauta(pautaId: string): Promise<void> {
  const path = `mini_pautas/${pautaId}`;
  try {
    await deleteDoc(doc(db, 'mini_pautas', pautaId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================================
// 6. Serviço de Presenças Biométricas (`presencas_biometricas`)
// ==========================================================

export async function registarPresencaBiometrica(presenca: Omit<PresencaBiometrica, 'id'>): Promise<string> {
  const now = new Date();
  const id = `bio_${presenca.aluno_id}_${now.getTime()}`;
  const path = `presencas_biometricas/${id}`;

  try {
    const payload: PresencaBiometrica = {
      id,
      ...presenca,
      data_hora: presenca.data_hora || now.toISOString(),
      codigo_recibo: presenca.codigo_recibo || `REC-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getTime().toString().slice(-6)}`,
    };

    await setDoc(doc(db, 'presencas_biometricas', id), payload);

    // Atualiza status no aluno se for sucesso
    if (presenca.status_reconhecimento === 'sucesso') {
      const alunoRef = doc(db, 'alunos', presenca.aluno_id);
      await updateDoc(alunoRef, {
        status_presenca: presenca.tipo === 'entrada' ? 'present' : 'present',
        ultimo_acesso: payload.data_hora,
      }).catch(() => {});
    }

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function getPresencasRecentes(limitCount = 20): Promise<PresencaBiometrica[]> {
  const path = 'presencas_biometricas';
  try {
    const q = query(collection(db, path), orderBy('data_hora', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PresencaBiometrica, 'id'>) }));
  } catch {
    // Fallback if index is building or unordered query
    const snap = await getDocs(query(collection(db, path), limit(limitCount)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PresencaBiometrica, 'id'>) }));
  }
}

export function listenPresencasRecentes(
  callback: (presencas: PresencaBiometrica[]) => void,
  limitCount = 25
) {
  const path = 'presencas_biometricas';
  const q = query(collection(db, path), limit(limitCount));

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PresencaBiometrica, 'id'>),
      }));
      // Sort in memory by date descending
      docs.sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function listenAlunos(callback: (alunos: Aluno[]) => void) {
  const path = 'alunos';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Aluno, 'id'>),
      }));
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function listenMiniPautas(
  callback: (pautas: MiniPauta[]) => void,
  filters?: { professorId?: string; turmaId?: string }
) {
  const path = 'mini_pautas';
  let q = query(collection(db, path));
  if (filters?.professorId) {
    q = query(q, where('professor_id', '==', filters.professorId));
  }
  if (filters?.turmaId) {
    q = query(q, where('turma_id', '==', filters.turmaId));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MiniPauta, 'id'>),
      }));
      callback(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==========================================================
// 7. Seed Automático para Inicialização Transparente
// ==========================================================

export async function seedInitialFirestoreData(): Promise<boolean> {
  try {
    // 1. Check if already seeded
    const usersCheck = await getDocs(query(collection(db, 'users'), limit(1)));
    if (!usersCheck.empty) {
      return true; // Already seeded
    }

    const batch = writeBatch(db);

    // 1. Criar Perfis de Usuários
    const defaultUsers: UserProfile[] = [
      {
        uid: 'user_pai_fernanda',
        nome: 'Fernanda Silva',
        email: 'fernanda.silva@email.com',
        telefone: '+244 923 884 912',
        role: 'encarregado',
        criado_em: new Date().toISOString(),
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
        escola_nome: 'Colégio Horizonte de Luanda',
      },
      {
        uid: 'user_prof_maria',
        nome: 'Profª. Maria Fernandes',
        email: 'maria.fernandes@colegiohorizonte.ao',
        telefone: '+244 912 340 556',
        role: 'professor',
        criado_em: new Date().toISOString(),
        avatarUrl: 'https://images.unsplash.com/photo-1580894732488-82550bfa3f80?w=300&auto=format&fit=crop&q=80',
        escola_nome: 'Colégio Horizonte de Luanda',
      },
      {
        uid: 'user_admin_carlos',
        nome: 'Dr. Carlos Manuel',
        email: 'direcao@colegiohorizonte.ao',
        telefone: '+244 931 990 001',
        role: 'instituicao',
        criado_em: new Date().toISOString(),
        avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
        escola_nome: 'Colégio Horizonte de Luanda',
      },
    ];

    defaultUsers.forEach((u) => {
      batch.set(doc(db, 'users', u.uid), u);
    });

    // 2. Criar Turmas
    const defaultTurmas: Turma[] = [
      {
        id: 'turma_10a',
        nome: '10ª Classe A',
        ano_lectivo: 2026,
        instituicao_id: 'user_admin_carlos',
        sala: 'Sala 102',
      },
      {
        id: 'turma_10b',
        nome: '10ª Classe B',
        ano_lectivo: 2026,
        instituicao_id: 'user_admin_carlos',
        sala: 'Sala 104',
      },
      {
        id: 'turma_11a',
        nome: '11ª Classe A',
        ano_lectivo: 2026,
        instituicao_id: 'user_admin_carlos',
        sala: 'Sala 201',
      },
    ];

    defaultTurmas.forEach((t) => {
      batch.set(doc(db, 'turmas', t.id), t);
    });

    // 3. Criar Atribuições de Professores
    const defaultAtribuicoes: TurmaProfessor[] = [
      {
        id: 'tp_maria_10a_mat',
        turma_id: 'turma_10a',
        professor_id: 'user_prof_maria',
        disciplina: 'Matemática',
      },
      {
        id: 'tp_maria_10a_fis',
        turma_id: 'turma_10a',
        professor_id: 'user_prof_maria',
        disciplina: 'Física',
      },
      {
        id: 'tp_maria_10b_mat',
        turma_id: 'turma_10b',
        professor_id: 'user_prof_maria',
        disciplina: 'Matemática',
      },
    ];

    defaultAtribuicoes.forEach((tp) => {
      batch.set(doc(db, 'turmas_professores', tp.id), tp);
    });

    // 4. Criar Alunos com Guia Médica Completa
    const defaultAlunos: Aluno[] = [
      {
        id: 'aluno_lucas_silva',
        nome_completo: 'Lucas Silva',
        matricula: '2026-00192',
        turma_id: 'turma_10a',
        encarregado_id: 'user_pai_fernanda',
        foto_biometrica_url: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&auto=format&fit=crop&q=80',
        biometric_code: 'BIO-FACIAL-99482-LUCAS',
        status_presenca: 'present',
        ultimo_acesso: '2026-05-20T07:32:15.000Z',
        guia_medica: {
          tipagem_sanguinea: 'O+',
          alergias: ['Amendoim', 'Penicilina'],
          tem_seguro: true,
          tipo_seguro: 'Seguro Escolar Completo Plus',
          seguradora: 'ENSA Seguros Angola',
          cobertura_detalhes: 'Internamento, Pronto Socorro Pediátrico 24h, Traumatologia e Cirurgia de Emergência',
          numero_apolice: 'SEG-ALO-2026-8821',
          contacto_emergencia: '+244 923 884 912 (Fernanda Silva)',
        },
      },
      {
        id: 'aluno_beatriz_santos',
        nome_completo: 'Beatriz Costa Santos',
        matricula: '2026-00193',
        turma_id: 'turma_10a',
        encarregado_id: 'user_pai_fernanda',
        foto_biometrica_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
        biometric_code: 'BIO-FACIAL-88319-BEATRIZ',
        status_presenca: 'present',
        ultimo_acesso: '2026-05-20T07:25:02.000Z',
        guia_medica: {
          tipagem_sanguinea: 'A+',
          alergias: ['Nenhuma alergia conhecida'],
          tem_seguro: true,
          tipo_seguro: 'Seguro Escolar Básico',
          seguradora: 'Nossa Seguros',
          cobertura_detalhes: 'Primeiros socorros escolares, Urgência e Transferência Hospitalar',
          numero_apolice: 'SEG-ALO-2026-8822',
          contacto_emergencia: '+244 924 551 092',
        },
      },
      {
        id: 'aluno_mateus_oliveira',
        nome_completo: 'Mateus Henrique Oliveira',
        matricula: '2026-00194',
        turma_id: 'turma_10a',
        encarregado_id: 'user_pai_outro',
        foto_biometrica_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
        biometric_code: 'BIO-FACIAL-77120-MATEUS',
        status_presenca: 'absent',
        guia_medica: {
          tipagem_sanguinea: 'B+',
          alergias: ['Dipirona'],
          tem_seguro: true,
          tipo_seguro: 'Seguro Escolar Premium',
          seguradora: 'Fidelidade Angola',
          cobertura_detalhes: 'Cobertura Integral Hospitalar e Medicamentosa',
          numero_apolice: 'SEG-ALO-2026-8823',
          contacto_emergencia: '+244 926 773 118',
        },
      },
      {
        id: 'aluno_rafael_mendes',
        nome_completo: 'Rafael Mendes',
        matricula: '2026-00201',
        turma_id: 'turma_10b',
        encarregado_id: 'user_pai_carlos',
        foto_biometrica_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
        biometric_code: 'BIO-FACIAL-66291-RAFAEL',
        status_presenca: 'present',
        ultimo_acesso: '2026-05-20T07:21:44.000Z',
        guia_medica: {
          tipagem_sanguinea: 'AB+',
          alergias: ['Frutos secos'],
          tem_seguro: true,
          tipo_seguro: 'Seguro Escolar Completo Plus',
          seguradora: 'ENSA Seguros Angola',
          cobertura_detalhes: 'Pronto Socorro 24h e Ortopedia',
          numero_apolice: 'SEG-ALO-2026-8824',
          contacto_emergencia: '+244 923 119 443',
        },
      },
    ];

    defaultAlunos.forEach((a) => {
      batch.set(doc(db, 'alunos', a.id), a);
    });

    // 5. Criar Mini Pautas (uma aprovada e uma em submissão)
    const defaultMiniPautas: MiniPauta[] = [
      {
        id: 'pauta_10a_matematica_t1',
        turma_id: 'turma_10a',
        turma_nome: '10ª Classe A',
        disciplina: 'Matemática',
        professor_id: 'user_prof_maria',
        professor_nome: 'Profª. Maria Fernandes',
        trimestre: 1,
        ano_lectivo: 2026,
        status: 'aprovada',
        data_envio: '2026-04-10T14:30:00.000Z',
        data_aprovacao: '2026-04-12T09:15:00.000Z',
        notas: [
          {
            aluno_id: 'aluno_lucas_silva',
            aluno_nome: 'Lucas Silva',
            mac: 16.5,
            npp: 17.0,
            npt: 18.0,
            media_final: 17.2,
          },
          {
            aluno_id: 'aluno_beatriz_santos',
            aluno_nome: 'Beatriz Costa Santos',
            mac: 15.0,
            npp: 16.0,
            npt: 15.5,
            media_final: 15.5,
          },
          {
            aluno_id: 'aluno_mateus_oliveira',
            aluno_nome: 'Mateus Henrique Oliveira',
            mac: 12.0,
            npp: 13.5,
            npt: 14.0,
            media_final: 13.2,
          },
        ],
      },
      {
        id: 'pauta_10a_fisica_t2',
        turma_id: 'turma_10a',
        turma_nome: '10ª Classe A',
        disciplina: 'Física',
        professor_id: 'user_prof_maria',
        professor_nome: 'Profª. Maria Fernandes',
        trimestre: 2,
        ano_lectivo: 2026,
        status: 'submetida',
        data_envio: '2026-05-18T16:00:00.000Z',
        notas: [
          {
            aluno_id: 'aluno_lucas_silva',
            aluno_nome: 'Lucas Silva',
            mac: 17.0,
            npp: 18.5,
            npt: 16.5,
            media_final: 17.3,
          },
          {
            aluno_id: 'aluno_beatriz_santos',
            aluno_nome: 'Beatriz Costa Santos',
            mac: 14.0,
            npp: 15.0,
            npt: 14.5,
            media_final: 14.5,
          },
        ],
      },
    ];

    defaultMiniPautas.forEach((p) => {
      batch.set(doc(db, 'mini_pautas', p.id), p);
    });

    // 6. Criar Presenças Biométricas
    const defaultPresencas: PresencaBiometrica[] = [
      {
        id: 'bio_lucas_entry_1',
        aluno_id: 'aluno_lucas_silva',
        aluno_nome: 'Lucas Silva',
        aluno_foto: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&auto=format&fit=crop&q=80',
        turma_id: 'turma_10a',
        turma_nome: '10ª Classe A',
        data_hora: '2026-05-20T07:32:15.000Z',
        tipo: 'entrada',
        status_reconhecimento: 'sucesso',
        metodo: 'facial',
        localizacao: 'Portaria Principal — Torniquete 1',
        codigo_recibo: 'REC-20260520-73215-LUCAS',
      },
      {
        id: 'bio_beatriz_entry_1',
        aluno_id: 'aluno_beatriz_santos',
        aluno_nome: 'Beatriz Costa Santos',
        aluno_foto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
        turma_id: 'turma_10a',
        turma_nome: '10ª Classe A',
        data_hora: '2026-05-20T07:25:02.000Z',
        tipo: 'entrada',
        status_reconhecimento: 'sucesso',
        metodo: 'facial',
        localizacao: 'Portaria Principal — Torniquete 2',
        codigo_recibo: 'REC-20260520-72502-BEATRIZ',
      },
    ];

    defaultPresencas.forEach((pr) => {
      batch.set(doc(db, 'presencas_biometricas', pr.id), pr);
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.warn('Erro ao inicializar semente Firestore:', error);
    return false;
  }
}
