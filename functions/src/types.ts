export type UserRole = 'pai' | 'professor' | 'instituicao' | 'terminal' | 'admin' | 'encarregado';

export interface CustomClaims {
  role: UserRole;
  schoolId: string;
  studentIds?: string[];
  studentId?: string;
  classIds?: string[];
  assignedClassIds?: string[];
}

export interface StudentDoc {
  id: string;
  matricula: string;
  name: string;
  classId: string;
  className: string;
  schoolId: string;
  schoolName?: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  photoUrl?: string;
  status: 'present' | 'absent' | 'late';
  lastEntryTime?: string;
  lastExitTime?: string;
  biometricCode: string;
  insurancePolicyId: string;
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

export interface GradeDoc {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  grade: number;
  feedback?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  schoolId: string;
  approvedBy?: string;
  createdAt?: any;
  updatedAt?: any;
  trimestre?: number;
  mac?: number;
  npp?: number;
  npt?: number;
}

export interface StudentMedicalDoc {
  studentId: string;
  studentName: string;
  classId: string;
  schoolId: string;
  insurancePolicyId: string;
  insuranceProvider: string;
  policyType: 'basic' | 'comprehensive' | 'hospital' | 'other';
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

export interface NotificationDoc {
  id: string;
  type: 'reunion' | 'warning' | 'broadcast' | 'praise' | 'access_entry' | 'access_exit' | 'medical' | 'grade_approved';
  title: string;
  subject?: string;
  message: string;
  studentId?: string;
  studentName?: string;
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
