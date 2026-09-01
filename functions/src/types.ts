export type UserRole = 'pai' | 'professor' | 'instituicao' | 'terminal';

export interface CustomClaims {
  role: UserRole;
  schoolId: string;
  studentIds?: string[];
  studentId?: string;
  classIds?: string[]; // FIX #1: Turmas atribuídas ao docente
  assignedClassIds?: string[]; // Aliás de compatibilidade
}

export interface StudentDoc {
  id: string;
  matricula: string;
  name: string;
  classId: string;
  className: string;
  schoolId: string;
  schoolName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  photoUrl: string;
  status: 'present' | 'absent' | 'late';
  lastEntryTime?: string;
  lastExitTime?: string;
  biometricCode: string;
  insurancePolicyId: string;
}

export interface AccessLogDoc {
  id: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  classId: string; // FIX #3: classId estável obrigatório
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
}
