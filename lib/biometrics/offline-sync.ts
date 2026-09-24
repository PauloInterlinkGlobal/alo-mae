/**
 * Offline-first queue for attendance events.
 *
 * CORREÇÃO D1 (ADR 0004 / auditoria verificada): a fila sincroniza através do
 * motor de presença (`registerAttendanceBiometricEvent`) — nunca pelo caminho
 * legado `accessLogs` — garantindo que eventos registrados offline geram
 * attendanceEvents, dailyAttendance, notificações e auditoria ao voltar a rede.
 */
import { AttendanceEventType } from '@/lib/types';
import { registerAttendanceBiometricEvent } from '@/services/attendance-engine.service';

export interface PendingOfflineLog {
  id: string;
  studentId: string;
  type: 'entry' | 'exit' | AttendanceEventType;
  method: 'facial' | 'fingerprint' | 'manual';
  location: string;
  deviceId?: string;
  confidence?: number;
  reasonCode?: string;
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
   * Enqueues an attendance event locally when device is offline
   */
  public enqueue(
    studentId: string,
    type: 'entry' | 'exit' | AttendanceEventType,
    method: 'facial' | 'fingerprint' | 'manual' = 'facial',
    location = 'Portão Principal - Bloco A',
    deviceId?: string,
    confidence?: number,
    reasonCode?: string
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
      deviceId,
      confidence,
      reasonCode,
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
   * Flushes pending events through the attendance engine (full domain write).
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
        // Tipos legados 'entry'/'exit' → o motor decide automaticamente
        // o evento correto a partir do estado diário do aluno.
        const legacyEventType =
          item.type === 'ENTRADA' || item.type === 'SAIDA_TEMPORARIA' || item.type === 'RETORNO' || item.type === 'SAIDA_OFICIAL' || item.type === 'ACESSO_REJEITADO'
            ? (item.type as AttendanceEventType)
            : item.type === 'entry'
            ? 'ENTRADA'
            : undefined;

        await registerAttendanceBiometricEvent({
          studentId: item.studentId,
          eventType: legacyEventType,
          preferredMode: 'auto',
          method: item.method === 'facial' ? 'FACIAL' : item.method === 'fingerprint' ? 'FINGERPRINT' : 'MANUAL',
          location: item.location,
          deviceId: item.deviceId,
          confidence: item.confidence,
          reasonCode: item.reasonCode,
        });

        // Remove item from queue on success
        this.queue = this.queue.filter((q) => q.id !== item.id);
        this.saveQueue();
        syncedCount++;
        this.notify();
      } catch (err) {
        console.warn('Falha ao sincronizar evento offline com o motor de presença:', err);
        item.attempts += 1;
        errors++;
        // Descarta itens com demasiadas tentativas (ex.: aluno removido) para não bloquear a fila
        if (item.attempts >= 8) {
          console.warn('Evento offline descartado após 8 tentativas:', item.id);
          this.queue = this.queue.filter((q) => q.id !== item.id);
          this.saveQueue();
          this.notify();
        }
      }
    }

    this.isSyncing = false;
    this.notify();
    return { syncedCount, errors };
  }
}

export const offlineSyncManager = new OfflineSyncManager();
