export type AttendanceStatus = 'present' | 'absent' | 'late';

export type UserRole = 'pai' | 'professor' | 'instituicao';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl: string;
  schoolName: string;
  title?: string;
  studentId?: string;
}

export interface Student {
  id: string;
  matricula: string;
  name: string;
  classId: string;
  className: string;
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
}

export interface AccessLog {
  id: string;
  studentId: string;
  studentName: string;
  studentPhoto: string;
  className: string;
  schoolName: string;
  type: 'entry' | 'exit';
  timestamp: string; // HH:MM:SS
  date: string; // YYYY-MM-DD or DD de Mês de YYYY
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
  className?: string;
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
  teacherName: string;
  room: string;
  totalStudents: number;
  presentsToday: number;
  absentsToday: number;
  latesToday: number;
  monthlyPresents: number;
  monthlyAbsences: number;
  monthlyLates: number;
  frequencyRate: number; // percentage
}
