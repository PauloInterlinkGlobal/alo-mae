import { AccessLog, AttendanceEventType } from '@/lib/types';
import { registerBiometricAccess as firestoreRegisterAccess } from '@/services/access-logs.service';

export interface PendingOfflineLog {
  id: string;
  studentId: string;
  type: 'entry' | 'exit' | AttendanceEventType;
  method: 'facial' | 'fingerprint' | 'manual';
  location: string;
  timestamp: string;
  dateStr: string;
  receiptCode: string;
  enqueuedAt: number;
  attempts: number;
}

const STORAGE_KEY = 'alomae_offline_biometric_queue';

class OfflineSyncManager {
  private queue: PendingOfflineLog[] = [];
  private isSyncing: boolean = false;
  private listeners: Array<(queueLength: number, isOnline: boolean) => void> = [];
  private isOnline: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      this.loadQueue();

      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notify();
        this.flushQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notify();
      });

      // Periodic check every 15 seconds
      setInterval(() => {
        if (this.isOnline && this.queue.length > 0 && !this.isSyncing) {
          this.flushQueue();
        }
      }, 15000);
    }
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Storage error fallback
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public subscribe(fn: (queueLength: number, isOnline: boolean) => void): () => void {
    this.listeners.push(fn);
    fn(this.queue.length, this.isOnline);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.queue.length, this.isOnline));
  }

  /**
   * Enqueues an attendance log locally when device is offline
   */
  public enqueue(
    studentId: string,
    type: 'entry' | 'exit' | AttendanceEventType,
    method: 'facial' | 'fingerprint' | 'manual' = 'facial',
    location = 'Portão Principal - Bloco A'
  ): PendingOfflineLog {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('pt-PT');
    const receiptCode = `REC-OFFLINE-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const pendingLog: PendingOfflineLog = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studentId,
      type,
      method,
      location,
      timestamp: timeStr,
      dateStr,
      receiptCode,
      enqueuedAt: Date.now(),
      attempts: 0,
    };

    this.queue.push(pendingLog);
    this.saveQueue();
    this.notify();
    return pendingLog;
  }

  /**
   * Flushes and synchronizes all pending offline logs with Firestore
   */
  public async flushQueue(): Promise<{ syncedCount: number; errors: number }> {
    if (this.isSyncing || this.queue.length === 0) {
      return { syncedCount: 0, errors: 0 };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    let errors = 0;

    const currentItems = [...this.queue];

    for (const item of currentItems) {
      try {
        await firestoreRegisterAccess(
          item.studentId,
          item.type,
          item.method,
          item.location
        );

        // Remove item from queue on success
        this.queue = this.queue.filter((q) => q.id !== item.id);
        this.saveQueue();
        syncedCount++;
        this.notify();
      } catch (err) {
        console.warn('Falha ao sincronizar registo offline com Firebase:', err);
        item.attempts += 1;
        errors++;
      }
    }

    this.isSyncing = false;
    this.notify();
    return { syncedCount, errors };
  }
}

export const offlineSyncManager = new OfflineSyncManager();
