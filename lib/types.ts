import { Timestamp } from 'firebase/firestore';

export type UserRole = 'pai' | 'encarregado' | 'professor' | 'instituicao' | 'admin' | 'terminal';

export type InstitutionUserType =
  | 'admin'
  | 'direcao'
  | 'secretaria'
  | 'coordenacao'
  | 'portaria';

// ==========================================
// 1. Instituições (institutions/{institutionId})
// ==========================================
export interface Institution {
  id: string;
  name: string;
  legalName?: string;
  nif?: string;
  email: string;
  phone: string;
  address?: string;
  province?: string;
  municipality?: string;
  logoUrl?: string;
  active: boolean;
  gradingScale?: {
    minGrade: number;
    maxGrade: number;
    passingGrade: number;
  };
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

// ==========================================
// 2. Utilizadores (users/{uid})
// ==========================================
export interface UserProfile {
  uid: string;
  institutionId?: string;
  schoolId?: string;
  role: UserRole;
  institutionUserType?: InstitutionUserType;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  active?: boolean;
  emailVerified?: boolean;
  studentIds?: string[];
  schoolIds?: string[];
  classIds?: string[];
  title?: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
  lastLoginAt?: Timestamp | any;

  // Compatibilidade Legada
  nome?: string;
  telefone?: string;
  criado_em?: string;
  instituicao_id?: string;
  escola_nome?: string;
  id?: string;
  studentId?: string;
}

export interface UserAccount extends UserProfile {
  schoolName?: string;
  childrenIds?: string[];
}

// ==========================================
// 3. Alunos (students/{studentId})
// ==========================================
export type StudentStatus = 'active' | 'inactive' | 'transferred' | 'graduated';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'justified';

export interface Student {
  id: string;
  institutionId?: string;
  schoolId?: string;
  matricula: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string | Timestamp;
  gender?: 'M' | 'F' | string;
  photoUrl?: string;
  currentClassId?: string;
  currentAcademicYearId?: string;
  biometricCode: string;
  status: AttendanceStatus | StudentStatus | any;
  academicStatus?: StudentStatus;
  lastEntryTime?: string;
  lastExitTime?: string;
  insurancePolicyId?: string;
  parentUid?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;

  // Compatibilidade
  name: string;
  classId?: string;
  className?: string;
  schoolName?: string;
  guiaMedica?: GuiaMedica;
  nome_completo?: string;
  turma_id?: string;
  encarregado_id?: string;
  foto_biometrica_url?: string;
  guia_medica?: GuiaMedica;
  biometric_code?: string;
  status_presenca?: AttendanceStatus;
  ultimo_acesso?: string;
}

export interface Aluno extends Student {
  nome_completo: string;
  turma_id: string;
  encarregado_id: string;
  foto_biometrica_url: string;
  guia_medica: GuiaMedica;
}

// ==========================================
// 4. Relação Pai / Educando (guardianStudentLinks/{linkId})
// ==========================================
export interface GuardianStudentLink {
  id: string;
  institutionId: string;
  guardianUid: string;
  studentId: string;
  relationship: 'pai' | 'mae' | 'tutor' | 'encarregado' | 'outro';
  primaryGuardian: boolean;
  canReceiveNotifications: boolean;
  canViewGrades: boolean;
  canViewAttendance: boolean;
  canViewInsurance: boolean;
  active: boolean;
  createdAt?: Timestamp | any;
}

// ==========================================
// 5. Professores (teachers/{teacherId})
// ==========================================
export interface Teacher {
  id: string;
  uid: string;
  institutionId: string;
  employeeNumber?: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  title?: string;
  specialty?: string;
  active: boolean;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

// ==========================================
// 6. Anos Letivos e Períodos (academicYears, academicTerms)
// ==========================================
export interface AcademicYear {
  id: string;
  institutionId: string;
  name: string; // Ex: "2025/2026"
  startDate: string | Timestamp;
  endDate: string | Timestamp;
  active: boolean;
  createdAt?: Timestamp | any;
}

export interface AcademicTerm {
  id: string;
  institutionId: string;
  academicYearId: string;
  name: '1º Trimestre' | '2º Trimestre' | '3º Trimestre' | string;
  order: number;
  startDate: string | Timestamp;
  endDate: string | Timestamp;
  gradeEntryOpen: boolean;
  active: boolean;
}

// ==========================================
// 7. Turmas / Classes (classes/{classId})
// ==========================================
export interface SchoolClass {
  id: string;
  institutionId?: string;
  schoolId?: string;
  academicYearId?: string;
  gradeLevel?: string; // Ex: "10ª Classe"
  className?: string;  // Ex: "Turma A"
  name: string;        // Ex: "10ª Classe A"
  room?: string;
  shift?: 'manha' | 'tarde' | 'noite';
  totalStudents?: number;
  studentCount?: number;
  teacherIds?: string[];
  homeroomTeacherId?: string;
  homeroomTeacherName?: string;
  disciplinas?: string[];
  active: boolean;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface Turma {
  id: string;
  nome: string;
  ano_lectivo: number | string;
  instituicao_id: string;
  sala?: string;
  periodo?: string;
  total_alunos?: number;
  disciplinas?: string[];
  diretor_turma_id?: string;
  diretor_turma_nome?: string;
}

// ==========================================
// 8. Disciplinas (subjects/{subjectId})
// ==========================================
export interface Subject {
  id: string;
  institutionId: string;
  code?: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt?: Timestamp | any;
}

// ==========================================
// 9. Atribuição Professor + Turma + Disciplina
// ==========================================
export interface TeacherAssignment {
  id: string;
  institutionId: string;
  academicYearId?: string;
  teacherId: string;
  teacherUid: string;
  teacherName?: string;
  classId: string;
  className?: string;
  subjectId: string;
  subjectName?: string;
  weeklyHours?: number;
  active: boolean;
  createdAt?: Timestamp | any;
}

export interface TurmaProfessor {
  id: string;
  turma_id: string;
  professor_id: string;
  disciplina: string;
  instituicao_id?: string;
  turma_nome?: string;
  professor_nome?: string;
  ano_lectivo?: number | string;
  carga_horaria_semanal?: number;
}

// ==========================================
// 10. Matrículas (enrollments/{enrollmentId})
// ==========================================
export interface Enrollment {
  id: string;
  institutionId: string;
  studentId: string;
  classId: string;
  academicYearId: string;
  enrollmentNumber: string;
  enrollmentDate: string | Timestamp;
  status: 'active' | 'transferred' | 'cancelled' | 'completed';
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

// ==========================================
// 11. Presença (attendanceRecords/{attendanceId})
// ==========================================
export interface AttendanceRecord {
  id: string;
  institutionId: string;
  academicYearId?: string;
  studentId: string;
  studentName?: string;
  classId: string;
  dateKey: string; // YYYY-MM-DD
  status: AttendanceStatus;
  recordedByUid: string;
  source: 'teacher' | 'biometric' | 'institution' | 'system';
  note?: string;
  timestamp?: string | Timestamp;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

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
  institutionId?: string;
  averageGrade?: number;
  updatedAt?: Timestamp | any;
}

// ==========================================
// 12. Entrada e Saída / Biometria (accessLogs/{accessLogId})
// ==========================================
export interface AccessLog {
  id: string;
  institutionId?: string;
  schoolId?: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  classId?: string;
  className: string;
  type: 'entry' | 'exit';
  method: 'facial' | 'fingerprint' | 'manual' | 'digital';
  location: string;
  receiptCode: string;
  timestamp: string; // HH:MM:SS
  date: string;      // DD/MM/YYYY
  recordedByUid?: string;
  deviceId?: string;
  notified?: boolean;
  notifiedRecipient?: string;
  notificationStatus?: 'pending' | 'sent' | 'failed';
  statusNote?: string;
  createdAt?: Timestamp | any;
  schoolName?: string;
}

export interface PresencaBiometrica extends AccessLog {
  aluno_id: string;
  aluno_nome: string;
  aluno_foto?: string;
  turma_id: string;
  turma_nome: string;
  data_hora: string;
  status_reconhecimento: 'sucesso' | 'falha' | 'revisao';
  codigo_recibo: string;
  localizacao?: string;
  metodo?: string;
  tipo?: string;
}

// ==========================================
// 13. Notificações (notifications/{notificationId})
// ==========================================
export type NotificationType =
  | 'reunion'
  | 'warning'
  | 'broadcast'
  | 'praise'
  | 'access_entry'
  | 'access_exit'
  | 'medical'
  | 'grade_published'
  | 'mini_report_approved'
  | 'mini_report_rejected'
  | 'grade_approved'
  | 'teacher_message'
  | 'new_teacher_listing'
  | 'listing_approved'
  | 'listing_rejected'
  | 'medical_guide_issued'
  | 'medical_guide_updated';

export interface SchoolNotification {
  id: string;
  institutionId?: string;
  schoolId?: string;
  type: NotificationType;
  title: string;
  subject?: string;
  message: string;
  senderUid?: string;
  senderName: string;
  senderRole: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  className?: string;
  recipientUid?: string;
  targetUserUid?: string;
  targetType?: 'user' | 'guardians' | 'class' | 'institution';
  date: string;
  time: string;
  isRead: boolean;
  reunionDate?: string;
  reunionTime?: string;
  receiptCode?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

// ==========================================
// 14. Mini-Pautas e Notas (miniReports & grades)
// ==========================================
export type MiniReportStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'rascunho'
  | 'submetida'
  | 'aprovada'
  | 'rejeitada';

export interface MiniReport {
  id: string;
  institutionId?: string;
  academicYearId?: string;
  ano_lectivo?: number | string;
  termId?: string;
  trimestre: 1 | 2 | 3;
  classId?: string;
  className?: string;
  turma_id?: string;
  turma_nome?: string;
  subjectId?: string;
  subjectName?: string;
  disciplina: string;
  teacherId?: string;
  teacherUid?: string;
  teacherName?: string;
  professor_id?: string;
  professor_nome?: string;
  title?: string;
  status: MiniReportStatus;
  notas: NotaAluno[];
  submittedAt?: Timestamp | any;
  data_envio?: string;
  reviewedByUid?: string;
  reviewedAt?: Timestamp | any;
  data_aprovacao?: string;
  rejectionReason?: string | null;
  motivo_rejeicao?: string | null;
  publishedAt?: Timestamp | any;
  locked?: boolean;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
  data_criacao?: string;
}

export interface MiniPauta extends MiniReport {}

export interface StudentGrade {
  id: string;
  institutionId: string;
  studentId: string;
  studentName: string;
  studentMatricula?: string;
  miniReportId: string;
  continuousAssessment?: number; // MAC (Média de Avaliação Contínua)
  test1?: number;                // NPP (Nota da Prova do Professor)
  test2?: number;                // NPT (Nota da Prova Trimestral)
  exam?: number;
  finalGrade: number;            // Média Final (0-20)
  teacherComment?: string;
  absenceCount?: number;
  status: 'pending' | 'complete';
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
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
  faltas?: number;
}

export type GradeStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published';

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
  institutionId?: string;
  approvedBy?: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
  trimestre?: number;
  mac?: number;
  npp?: number;
  npt?: number;
}

// ==========================================
// 15. Seguros (insuranceProviders, insurancePolicies, studentInsurance)
// ==========================================
export interface InsuranceProvider {
  id: string;
  institutionId?: string;
  name: string;
  nif?: string;
  phone?: string;
  emergencyPhone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  active: boolean;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export type InsuranceType = 'school' | 'health' | 'accident' | 'combined' | 'other';

export interface InsuranceCoverage {
  id: string;
  name: string;
  description?: string;
  category:
    | 'emergency'
    | 'consultation'
    | 'hospitalization'
    | 'medication'
    | 'laboratory'
    | 'imaging'
    | 'dental'
    | 'transport'
    | 'accident'
    | 'other';
  coveragePercentage: number; // Ex: 100 para 100%
  maximumAmount?: number;
  currency?: string;
  requiresAuthorization: boolean;
  active: boolean;
}

export interface InsurancePolicy {
  id: string;
  institutionId: string;
  providerId: string;
  providerName?: string;
  policyNumber: string;
  name: string;
  type: InsuranceType;
  startDate: string | Timestamp;
  endDate: string | Timestamp;
  coverageLimit?: number;
  currency?: 'AOA' | 'USD' | string;
  coverages: InsuranceCoverage[];
  active: boolean;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export interface StudentInsurance {
  id: string;
  institutionId: string;
  studentId: string;
  studentName?: string;
  providerId: string;
  providerName: string;
  policyId: string;
  policyNumber: string;
  memberNumber?: string;
  active: boolean;
  startDate?: string | Timestamp;
  endDate?: string | Timestamp;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

// ==========================================
// 16. Clínicas Conveniadas (medicalClinics/{clinicId})
// ==========================================
export interface MedicalClinic {
  id: string;
  institutionId?: string;
  providerIds?: string[];
  name: string;
  specialty: string;
  address: string;
  province?: string;
  municipality?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: string;
  timeMin?: string;
  emergencyPhone: string;
  services: string[];
  imageUrl: string;
  available24h: boolean;
  active?: boolean;
  schoolId?: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

// ==========================================
// 17. Guia Médica / Atendimento (medicalGuides/{medicalGuideId})
// ==========================================
export type MedicalGuidePriority = 'normal' | 'urgent' | 'emergency';
export type MedicalGuideStatus = 'draft' | 'issued' | 'accepted' | 'in_service' | 'completed' | 'cancelled';

export interface MedicalGuide {
  id: string;
  guideNumber: string; // Ex: "GM-2026-0042"
  institutionId: string;
  schoolName?: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  studentMatricula: string;
  className: string;
  guardianUid?: string;
  guardianName?: string;
  emergencyContactPhone?: string;
  clinicId: string;
  clinicName: string;
  clinicAddress: string;
  clinicEmergencyPhone: string;
  insuranceProviderId?: string;
  insuranceProviderName: string;
  insurancePolicyId?: string;
  insurancePolicyNumber: string;
  insuranceType?: string;
  coveragesSummary?: string;
  reason?: string;
  priority: MedicalGuidePriority;
  status: MedicalGuideStatus;
  issuedByUid: string;
  issuedByName: string;
  issuedAt: string | Timestamp | any;
  expiresAt?: string | Timestamp | any;
  notes?: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

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

export interface StudentMedical {
  studentId: string;
  studentName: string;
  classId: string;
  schoolId?: string;
  institutionId?: string;
  insurancePolicyId: string;
  insuranceProvider: string;
  policyType: 'basic' | 'comprehensive' | 'hospital' | 'other' | string;
  coverage: string[];
  validityStart: string;
  validityEnd: string;
  emergencyPhone: string;
  emergencyContactName: string;
  allergies?: string[];
  chronicConditions?: string[];
  notes?: string;
  updatedAt?: Timestamp | any;
}

// ==========================================
// 18. Auditoria (auditLogs/{auditId})
// ==========================================
export interface AuditLog {
  id: string;
  institutionId: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action:
    | 'create_student'
    | 'update_student'
    | 'create_grade'
    | 'submit_mini_report'
    | 'approve_mini_report'
    | 'reject_mini_report'
    | 'publish_mini_report'
    | 'issue_medical_guide'
    | 'medical_guide_printed'
    | 'cancel_medical_guide'
    | 'update_insurance'
    | 'biometric_access'
    | 'send_notification'
    | 'admin_action';
  entityType: string;
  entityId: string;
  description: string;
  previousData?: unknown;
  newData?: unknown;
  timestamp: Timestamp | any;
}

// ==========================================
// 19. Anúncios de Professores (teacherListings/{listingId})
// ==========================================
export type TeacherListingCategory =
  | 'tutoring'
  | 'home_tutoring'
  | 'online'
  | 'exam_preparation'
  | 'academic_support'
  | 'other';

export type TeacherListingModality =
  | 'home'
  | 'online'
  | 'school'
  | 'other';

export type TeacherListingStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface TeacherListingLocation {
  province?: string;
  municipality?: string;
  district?: string;
  description?: string;
}

export interface TeacherListingAvailability {
  days?: string[];
  startTime?: string;
  endTime?: string;
}

export interface TeacherListing {
  id: string;
  institutionId: string;
  teacherUid: string;
  teacherId: string;
  teacherName?: string;
  teacherPhoto?: string;
  title: string;
  description: string;
  subjectId?: string;
  targetClasses?: string[];
  category: TeacherListingCategory;
  modality: TeacherListingModality;
  location?: TeacherListingLocation;
  availability?: TeacherListingAvailability;
  price?: number;
  currency?: string;
  contactPhone?: string;
  showPhone?: boolean;
  imageUrl?: string;
  status: TeacherListingStatus;
  rejectionReason?: string;
  publishedAt?: any;
  createdAt: any;
  updatedAt: any;
}

// ==========================================
// 20. Conversas e Mensagens de Chat Interno
// ==========================================
export type ConversationContext =
  | 'student'
  | 'academic'
  | 'announcement'
  | 'medical'
  | 'general';

export interface Conversation {
  id: string;
  institutionId: string;
  participantIds: string[];
  teacherUid: string;
  guardianUid: string;
  studentId: string;
  subjectId?: string;
  context: ConversationContext;
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt: any;
  updatedAt: any;
  active: boolean;

  // Metadata para listagem e busca
  teacherName: string;
  teacherPhoto?: string;
  guardianName: string;
  guardianPhoto?: string;
  studentName: string;
  studentClass?: string;
  subjectName?: string;
  unreadCountTeacher?: number;
  unreadCountGuardian?: number;
}

export type AttachmentType = 'image' | 'document' | 'pdf';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUid: string;
  receiverUid?: string;
  senderName?: string;
  senderRole?: 'professor' | 'pai' | 'encarregado' | 'instituicao';
  text?: string;
  attachmentUrl?: string;
  attachmentType?: AttachmentType;
  attachmentName?: string;
  read: boolean;
  readAt?: any;
  createdAt: any;
}

