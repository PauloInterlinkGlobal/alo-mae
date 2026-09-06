export type UserRole = 'pai' | 'professor' | 'instituicao' | 'terminal' | 'admin' | 'encarregado';

export interface CustomClaims {
  role: UserRole;
  schoolId?: string;
  schoolIds?: string[];
  studentIds?: string[];
  studentId?: string;
  classIds?: string[];
  assignedClassIds?: string[];
  [key: string]: any;
}

export interface SchoolClass {
  id: string;
  name: string;
  schoolId: string;
  teacherIds: string[];
  studentCount: number;
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface StudentDoc {
  id: string;
  matricula: string;
  name: string;
  classId: string;
  className?: string;
  schoolId: string;
  schoolName?: string;
  parentUid?: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  photoUrl?: string;
  status: 'present' | 'absent' | 'late';
  lastEntryTime?: string;
  lastExitTime?: string;
  biometricCode: string;
  insurancePolicyId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AccessLogDoc {
  id: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  classId: string;
  className?: string;
  schoolId: string;
  schoolName?: string;
  type: 'entry' | 'exit';
  timestamp: string;
  date: string;
  location: string;
  method: 'facial' | 'fingerprint' | 'manual';
  receiptCode: string;
  notified?: boolean;
  notifiedRecipient?: string;
  statusNote?: string;
  createdAt?: any;
}

export interface Grade {
  subject: string;
  score: number;
}

export interface MiniPautaDoc {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className?: string;
  schoolId: string;
  professorId: string;
  professorName: string;
  period: string;
  grades: Grade[];
  average: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface NotificationDoc {
  id: string;
  type: 'reunion' | 'warning' | 'broadcast' | 'praise' | 'access_entry' | 'access_exit' | 'medical' | 'grade_approved';
  title: string;
  subject?: string;
  message: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  className?: string;
  schoolId: string;
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
}
