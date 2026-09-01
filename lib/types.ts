export type UserRole = 'instituicao' | 'professor' | 'encarregado' | 'pai' | 'admin';

// 1. Coleção: users
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: 'pai' | 'professor' | 'instituicao' | 'encarregado' | 'admin';
  avatarUrl?: string;
  schoolId?: string;
  title?: string;
  studentId?: string;
  studentIds?: string[];
  classIds?: string[];
  createdAt?: any;
  updatedAt?: any;
  // Compatibilidade PT
  nome?: string;
  telefone?: string;
  criado_em?: string;
  instituicao_id?: string;
  escola_nome?: string;
  id?: string;
}

export interface UserAccount extends UserProfile {
  schoolName?: string;
  childrenIds?: string[];
}

// 2. Coleção: students
export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface Student {
  id: string;
  matricula: string;
  name: string;
  classId: string;
  className: string;
  schoolId?: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  photoUrl?: string;
  status: AttendanceStatus;
  lastEntryTime?: string;
  lastExitTime?: string;
  biometricCode: string;
  insurancePolicyId: string;
  createdAt?: any;
  updatedAt?: any;
  // Compatibilidade
  schoolName?: string;
  guiaMedica?: GuiaMedica;
  nome_completo?: string;
  turma_id?: string;
  encarregado_id?: string;
}

// 3. Coleção: classStats
export interface ClassAttendanceStat {
  classId: string;
  className: string;
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
  schoolId?: string;
  averageGrade?: number;
  updatedAt?: any;
}

// 4. Coleção: accessLogs
export interface AccessLog {
  id: string;
  studentId: string;
  studentName: string;
  studentPhoto: string;
  className: string;
  schoolId?: string;
  type: 'entry' | 'exit';
  timestamp: string; // HH:MM:SS
  date: string; // DD/MM/YYYY
  location: string;
  method: 'facial' | 'fingerprint' | 'manual' | 'digital';
  receiptCode: string;
  notified: boolean;
  notifiedRecipient: string;
  statusNote?: string;
  createdAt?: any;
  // Compatibilidade
  schoolName?: string;
  classId?: string;
}

// 5. Coleção: notifications
export type NotificationType =
  | 'reunion'
  | 'warning'
  | 'broadcast'
  | 'praise'
  | 'access_entry'
  | 'access_exit'
  | 'medical'
  | 'grade_approved';

export interface SchoolNotification {
  id: string;
  type: NotificationType;
  title: string;
  subject?: string;
  message: string;
  studentId?: string;
  studentName?: string;
  className?: string;
  schoolId?: string;
  senderName: string;
  senderRole: string;
  date: string;
  time: string;
  isRead: boolean;
  targetUserUid?: string;
  reunionDate?: string;
  reunionTime?: string;
  receiptCode?: string;
  createdAt?: any;
  updatedAt?: any;
  classId?: string;
}

// 6. Coleção: medicalClinics
export interface MedicalClinic {
  id: string;
  name: string;
  specialty: string;
  address: string;
  district?: string;
  distanceKm?: string;
  timeMin?: string;
  emergencyPhone: string;
  services: string[];
  imageUrl: string;
  available24h: boolean;
  schoolId?: string;
}

// 7. Coleção: grades (mini pautas / boletins)
export type GradeStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  grade: number; // 0-20
  feedback?: string;
  status: GradeStatus;
  schoolId?: string;
  approvedBy?: string;
  createdAt?: any;
  updatedAt?: any;
  trimestre?: number;
  mac?: number;
  npp?: number;
  npt?: number;
}

// 8. Coleção: studentMedical (guia médica)
export type PolicyType = 'basic' | 'comprehensive' | 'hospital' | 'other';

export interface StudentMedical {
  studentId: string;
  studentName: string;
  classId: string;
  schoolId?: string;
  insurancePolicyId: string;
  insuranceProvider: string;
  policyType: PolicyType;
  coverage: string[];
  validityStart: string;
  validityEnd: string;
  emergencyPhone: string;
  emergencyContactName: string;
  allergies?: string[];
  chronicConditions?: string[];
  notes?: string;
  updatedAt?: any;
}

// Compatibilidade com estrutura de Pautas e Guias existentes
export interface GuiaMedica {
  tipagem_sanguinea: string;
  alergias: string[];
  tem_seguro: boolean;
  tipo_seguro: string;
  seguradora: string;
  cobertura_detalhes: string;
  numero_apolice: string;
  contacto_emergencia: string;
  doencas_cronicas?: string[];
  observacoes?: string;
}

export interface Aluno extends Student {
  nome_completo: string;
  turma_id: string;
  encarregado_id: string;
  foto_biometrica_url: string;
  guia_medica: GuiaMedica;
  biometric_code?: string;
  status_presenca?: AttendanceStatus;
  ultimo_acesso?: string;
}

export interface Turma {
  id: string;
  nome: string;
  ano_lectivo: number;
  instituicao_id: string;
  sala?: string;
}

export interface TurmaProfessor {
  id: string;
  turma_id: string;
  professor_id: string;
  disciplina: string;
}

export interface NotaAluno {
  aluno_id: string;
  aluno_nome: string;
  aluno_matricula?: string;
  mac: number;
  npp: number;
  npt: number;
  media_final: number;
  observacao?: string;
}

export interface MiniPauta {
  id: string;
  turma_id: string;
  turma_nome?: string;
  professor_id: string;
  professor_nome?: string;
  disciplina: string;
  trimestre: 1 | 2 | 3;
  ano_lectivo: number;
  status: 'rascunho' | 'submetida' | 'aprovada' | 'rejeitada';
  notas: NotaAluno[];
  data_criacao?: string;
  data_envio?: string;
  data_aprovacao?: string;
  motivo_rejeicao?: string | null;
}

export interface PresencaBiometrica {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_foto?: string;
  turma_id: string;
  turma_nome: string;
  data_hora: string;
  tipo: 'entrada' | 'saida';
  status_reconhecimento: 'sucesso' | 'falha' | 'revisao';
  metodo: 'facial' | 'fingerprint' | 'digital' | 'manual';
  localizacao: string;
  codigo_recibo: string;
  // Compatibilidade
  studentId?: string;
  studentName?: string;
  studentPhoto?: string;
  className?: string;
  timestamp?: string;
  date?: string;
  location?: string;
  receiptCode?: string;
  type?: 'entry' | 'exit';
  method?: 'facial' | 'fingerprint' | 'manual' | 'digital';
}
