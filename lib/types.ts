export type UserRole = 'instituicao' | 'professor' | 'encarregado' | 'pai' | 'admin';

// 1. Coleção: users
export interface UserProfile {
  uid: string;
  nome: string;
  email: string;
  telefone: string;
  role: UserRole;
  criado_em: string;
  avatarUrl?: string;
  instituicao_id?: string;
  escola_nome?: string;
  // Campos auxiliares de compatibilidade
  id?: string;
  name?: string;
  phone?: string;
}

// 2. Coleção: alunos
export interface GuiaMedica {
  tipagem_sanguinea: string;
  alergias: string[];
  tem_seguro: boolean;
  tipo_seguro: string;
  seguradora: string;
  cobertura_detalhes: string;
  numero_apolice: string;
  contacto_emergencia: string;
}

export interface Aluno {
  id: string;
  nome_completo: string;
  turma_id: string;
  encarregado_id: string;
  foto_biometrica_url: string;
  guia_medica: GuiaMedica;
  matricula?: string;
  biometric_code?: string;
  status_presenca?: 'present' | 'absent' | 'late';
  ultimo_acesso?: string;
}

// 3. Coleção: turmas
export interface Turma {
  id: string;
  nome: string; // Ex: "10ª Classe A"
  ano_lectivo: number;
  instituicao_id: string;
  sala?: string;
}

// 4. Coleção: turmas_professores
export interface TurmaProfessor {
  id: string;
  turma_id: string;
  professor_id: string;
  disciplina: string;
}

// 5. Coleção: mini_pautas
export type MiniPautaStatus = 'rascunho' | 'submetida' | 'aprovada' | 'rejeitada';

export interface NotaAluno {
  aluno_id: string;
  aluno_nome?: string;
  mac: number; // Média de Avaliação Contínua
  npp: number; // Nota da Prova do Professor
  npt: number; // Nota da Prova Trimestral
  media_final: number;
}

export interface MiniPauta {
  id: string;
  turma_id: string;
  turma_nome?: string;
  disciplina: string;
  professor_id: string;
  professor_nome?: string;
  trimestre: 1 | 2 | 3;
  ano_lectivo: number;
  status: MiniPautaStatus;
  data_envio?: string;
  data_aprovacao?: string;
  motivo_rejeicao?: string;
  notas: NotaAluno[];
}

// 6. Coleção: presencas_biometricas
export interface PresencaBiometrica {
  id: string;
  aluno_id: string;
  aluno_nome?: string;
  aluno_foto?: string;
  turma_id: string;
  turma_nome?: string;
  data_hora: string; // Timestamp ISO
  tipo: 'entrada' | 'saida';
  status_reconhecimento: 'sucesso' | 'falha';
  metodo?: 'facial' | 'digital' | 'fingerprint' | 'manual';
  localizacao?: string;
  codigo_recibo?: string;
}

// Modelos Legados / Compatibilidade UI
export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface UserAccount extends UserProfile {
  schoolName?: string;
  schoolId?: string;
  title?: string;
  studentId?: string;
  childrenIds?: string[];
  classIds?: string[];
}

export interface Student {
  id: string;
  matricula: string;
  name: string;
  classId: string;
  className: string;
  schoolId?: string;
  schoolName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  photoUrl: string;
  status: AttendanceStatus;
  lastEntryTime?: string;
  lastExitTime?: string;
  biometricCode: string;
  insurancePolicyId: string;
  guiaMedica?: GuiaMedica;
}

export interface AccessLog {
  id: string;
  studentId: string;
  studentName: string;
  studentPhoto: string;
  classId?: string;
  className: string;
  schoolId?: string;
  schoolName: string;
  type: 'entry' | 'exit';
  timestamp: string;
  date: string;
  location: string;
  method: 'facial' | 'fingerprint' | 'manual';
  receiptCode: string;
  notified: boolean;
  notifiedRecipient: string;
  statusNote?: string;
}

export type NotificationType = 'reunion' | 'warning' | 'broadcast' | 'praise' | 'access_entry' | 'access_exit' | 'medical';

export interface SchoolNotification {
  id: string;
  type: NotificationType;
  title: string;
  subject?: string;
  message: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  className?: string;
  schoolId?: string;
  senderName: string;
  senderRole: string;
  date: string;
  time: string;
  isRead: boolean;
  reunionDate?: string;
  reunionTime?: string;
  receiptCode?: string;
}

export interface MedicalClinic {
  id: string;
  name: string;
  specialty: string;
  address: string;
  district: string;
  distanceKm: string;
  timeMin: string;
  emergencyPhone: string;
  services: string[];
  imageUrl: string;
  available24h: boolean;
}

export interface ClassAttendanceStat {
  classId: string;
  className: string;
  schoolId?: string;
  teacherName: string;
  room: string;
  totalStudents: number;
  presentsToday: number;
  absentsToday: number;
  latesToday: number;
  monthlyPresents: number;
  monthlyAbsences: number;
  monthlyLates: number;
  frequencyRate: number;
}
