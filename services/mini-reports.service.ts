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
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MiniReport, MiniReportStatus, NotaAluno, StudentGrade, Grade, AuditLog } from '@/lib/types';
import { recordAuditLog } from './audit.service';
import { createNotification } from './notifications.service';

export function listenMiniReports(
  institutionId?: string,
  teacherUid?: string,
  classId?: string,
  callback?: (reports: MiniReport[]) => void
) {
  let q = query(collection(db, 'miniReports'), orderBy('createdAt', 'desc'));
  if (teacherUid) {
    q = query(collection(db, 'miniReports'), where('teacherUid', '==', teacherUid));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const list: MiniReport[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as MiniReport;
        list.push({
          ...data,
          id: docSnap.id,
          disciplina: data.disciplina || data.subjectName || 'Disciplina',
          turma_nome: data.turma_nome || data.className || 'Turma',
          trimestre: data.trimestre || 1,
        });
      });
      if (callback) callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar mini-pautas:', err);
    }
  );
}

export function listenPublishedGradesByStudent(
  studentId: string,
  callback?: (grades: Grade[]) => void
) {
  const q = query(
    collection(db, 'grades'),
    where('studentId', '==', studentId),
    where('status', 'in', ['published', 'approved'])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Grade[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Grade);
      });
      if (callback) callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar notas do aluno:', err);
    }
  );
}

export async function createMiniReport(
  data: Omit<MiniReport, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  actor: { uid: string; name: string; role: string }
): Promise<string> {
  const newRef = doc(collection(db, 'miniReports'));
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-PT');

  const payload: MiniReport = {
    ...data,
    id: newRef.id,
    title: data.title || `${data.disciplina} - ${data.turma_nome} (${data.trimestre}º Trimestre)`,
    status: 'draft',
    locked: false,
    data_criacao: dateStr,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newRef, payload);

  await recordAuditLog({
    institutionId: data.institutionId || 'school_horizonte_luanda',
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'submit_mini_report',
    entityType: 'miniReports',
    entityId: newRef.id,
    description: `Criou rascunho de mini-pauta: ${payload.title}`,
    newData: payload,
  });

  return newRef.id;
}

export async function saveMiniReportGrades(
  reportId: string,
  notas: NotaAluno[],
  actor: { uid: string; name: string; role: string }
): Promise<void> {
  const reportRef = doc(db, 'miniReports', reportId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) throw new Error('Mini-pauta não encontrada');

  const report = snap.data() as MiniReport;
  if (report.locked && report.status !== 'rejected') {
    throw new Error('Esta mini-pauta está bloqueada para edição.');
  }

  await updateDoc(reportRef, {
    notas,
    updatedAt: serverTimestamp(),
  });
}

export async function submitMiniReport(
  reportId: string,
  actor: { uid: string; name: string; role: string }
): Promise<void> {
  const reportRef = doc(db, 'miniReports', reportId);
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-PT');

  await updateDoc(reportRef, {
    status: 'submitted',
    locked: true,
    data_envio: dateStr,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await recordAuditLog({
    institutionId: 'school_horizonte_luanda',
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'submit_mini_report',
    entityType: 'miniReports',
    entityId: reportId,
    description: `Submeteu a mini-pauta ${reportId} para aprovação da instituição`,
  });
}

export async function approveMiniReport(
  reportId: string,
  actor: { uid: string; name: string; role: string }
): Promise<void> {
  const reportRef = doc(db, 'miniReports', reportId);
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-PT');

  await updateDoc(reportRef, {
    status: 'approved',
    reviewedByUid: actor.uid,
    reviewedAt: serverTimestamp(),
    data_aprovacao: dateStr,
    locked: true,
    rejectionReason: null,
    motivo_rejeicao: null,
    updatedAt: serverTimestamp(),
  });

  await recordAuditLog({
    institutionId: 'school_horizonte_luanda',
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'approve_mini_report',
    entityType: 'miniReports',
    entityId: reportId,
    description: `Aprovou a mini-pauta ${reportId}`,
  });
}

export async function rejectMiniReport(
  reportId: string,
  motivo: string,
  actor: { uid: string; name: string; role: string }
): Promise<void> {
  const reportRef = doc(db, 'miniReports', reportId);

  await updateDoc(reportRef, {
    status: 'rejected',
    locked: false,
    rejectionReason: motivo,
    motivo_rejeicao: motivo,
    reviewedByUid: actor.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await recordAuditLog({
    institutionId: 'school_horizonte_luanda',
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'reject_mini_report',
    entityType: 'miniReports',
    entityId: reportId,
    description: `Rejeitou a mini-pauta ${reportId}. Motivo: ${motivo}`,
  });
}

export async function publishMiniReport(
  reportId: string,
  actor: { uid: string; name: string; role: string }
): Promise<void> {
  const reportRef = doc(db, 'miniReports', reportId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) throw new Error('Mini-pauta não encontrada');

  const report = snap.data() as MiniReport;
  const batch = writeBatch(db);

  // 1. Mark report as published
  batch.update(reportRef, {
    status: 'published',
    publishedAt: serverTimestamp(),
    locked: true,
    updatedAt: serverTimestamp(),
  });

  // 2. Publish individual student grades into /grades collection
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-PT');
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  for (const n of report.notas || []) {
    const gradeDocId = `grade_${reportId}_${n.aluno_id}`;
    const gradeRef = doc(db, 'grades', gradeDocId);
    const gradeData: Grade = {
      id: gradeDocId,
      studentId: n.aluno_id,
      studentName: n.aluno_nome,
      classId: report.classId || report.turma_id || 'turma_10a',
      className: report.className || report.turma_nome || 'Turma',
      subject: report.disciplina || report.subjectName || 'Disciplina',
      teacherId: report.teacherUid || report.teacherId || actor.uid,
      teacherName: report.teacherName || report.professor_nome || actor.name,
      grade: n.media_final,
      mac: n.mac,
      npp: n.npp,
      npt: n.npt,
      trimestre: report.trimestre || 1,
      feedback: n.observacao || 'Desempenho avaliado',
      status: 'published',
      schoolId: report.institutionId || 'school_horizonte_luanda',
      approvedBy: actor.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(gradeRef, gradeData);

    // Create notification for student/parent
    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      id: notifRef.id,
      institutionId: report.institutionId || 'school_horizonte_luanda',
      type: 'grade_published',
      title: `Novas Notas Disponíveis: ${report.disciplina}`,
      subject: `Boletim ${report.trimestre}º Trimestre`,
      message: `As notas do ${report.trimestre}º Trimestre de ${report.disciplina} de ${n.aluno_nome} foram publicadas com média final de ${n.media_final} valores.`,
      studentId: n.aluno_id,
      studentName: n.aluno_nome,
      className: report.className || report.turma_nome,
      senderName: actor.name,
      senderRole: actor.role,
      date: dateStr,
      time: timeStr,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();

  await recordAuditLog({
    institutionId: report.institutionId || 'school_horizonte_luanda',
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'publish_mini_report',
    entityType: 'miniReports',
    entityId: reportId,
    description: `Publicou as notas da mini-pauta ${report.title} para os encarregados`,
  });
}
