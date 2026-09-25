export type FingerprintReaderState = 'standby' | 'reading' | 'connected' | 'error';

export interface FingerprintCandidate {
  id: string;
  matricula?: string;
}

export interface FingerprintMatch {
  studentId: string;
  confidence: number;
}

export interface FingerprintIdentifyProvider {
  readonly kind: 'external-reader';
  isAvailable(): Promise<boolean>;
  identify(candidates: FingerprintCandidate[]): Promise<FingerprintMatch | null>;
  cancel(): Promise<void>;
  subscribe(listener: (event: { type: 'state' | 'match'; state?: FingerprintReaderState; match?: FingerprintMatch }) => void): () => void;
}

/**
 * Browser-safe adapter. The real Capacitor plugin can replace this provider
 * without exposing fingerprint images or templates to the web layer.
 */
export class BrowserFingerprintIdentifyProvider implements FingerprintIdentifyProvider {
  readonly kind = 'external-reader' as const;

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'Capacitor' in window;
  }

  async identify(_candidates: FingerprintCandidate[]): Promise<FingerprintMatch | null> {
    return null;
  }

  async cancel(): Promise<void> {}

  subscribe(listener: (event: { type: 'state' | 'match'; state?: FingerprintReaderState; match?: FingerprintMatch }) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const onMatch = (event: Event) => {
      const detail = (event as CustomEvent<FingerprintMatch>).detail;
      if (detail?.studentId) listener({ type: 'match', match: detail });
    };
    const onState = (event: Event) => {
      const state = (event as CustomEvent<{ state?: FingerprintReaderState }>).detail?.state;
      if (state) listener({ type: 'state', state });
    };

    window.addEventListener('alomae:fingerprint-match', onMatch);
    window.addEventListener('alomae:fingerprint-state', onState);
    return () => {
      window.removeEventListener('alomae:fingerprint-match', onMatch);
      window.removeEventListener('alomae:fingerprint-state', onState);
    };
  }
}

export function createFingerprintIdentifyProvider(): FingerprintIdentifyProvider {
  return new BrowserFingerprintIdentifyProvider();
}
