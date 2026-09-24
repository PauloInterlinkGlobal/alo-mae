/**
 * Camera access helper with precise failure diagnosis.
 *
 * Causa mais comum em ambientes de preview: a página corre dentro de um iframe
 * cross-origin sem delegação `allow="camera"` — o navegador nega o getUserMedia
 * automaticamente (NotAllowedError), sem mostrar o prompt de permissão.
 */

export type CameraErrorKind =
  | 'denied'
  | 'insecure'
  | 'not-found'
  | 'in-use'
  | 'overconstrained'
  | 'unknown';

export interface CameraRequestResult {
  stream: MediaStream | null;
  errorKind: CameraErrorKind | null;
  errorName: string | null;
  message: string;
}

export function isEmbeddedInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // acesso cross-origin lançou → com certeza está embutido
  }
}

export function isSecureEnough(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true;
}

export async function queryCameraPermission(): Promise<PermissionState | 'unsupported'> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unsupported';
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return status.state;
  } catch {
    return 'unsupported';
  }
}

function mapCameraError(err: any): { kind: CameraErrorKind; message: string } {
  const name = err?.name || '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return {
        kind: 'denied',
        message: 'Permissão da câmara negada pelo navegador.',
      };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return { kind: 'not-found', message: 'Nenhuma câmara encontrada neste dispositivo.' };
    case 'NotReadableError':
    case 'TrackStartError':
      return { kind: 'in-use', message: 'A câmara está em uso por outra aplicação (ex.: Zoom/Meet).' };
    case 'OverconstrainedError':
      return { kind: 'overconstrained', message: 'A câmara não suporta a resolução pedida.' };
    default:
      return { kind: 'unknown', message: err?.message || String(err) };
  }
}

export async function requestCameraStream(): Promise<CameraRequestResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      stream: null,
      errorKind: 'insecure',
      errorName: 'Unsupported',
      message: 'getUserMedia indisponível neste navegador/WebView.',
    };
  }
  if (!isSecureEnough()) {
    return {
      stream: null,
      errorKind: 'insecure',
      errorName: 'InsecureContext',
      message: 'A câmara exige HTTPS (contexto seguro). Abra a página em https://.',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    return { stream, errorKind: null, errorName: null, message: 'ok' };
  } catch (err: any) {
    const mapped = mapCameraError(err);
    // Última tentativa com constraints mínimas (câmaras antigas/VMs)
    if (mapped.kind === 'overconstrained') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        return { stream, errorKind: null, errorName: null, message: 'ok' };
      } catch (err2: any) {
        const m2 = mapCameraError(err2);
        return { stream: null, errorKind: m2.kind, errorName: err2?.name || null, message: m2.message };
      }
    }
    return { stream: null, errorKind: mapped.kind, errorName: err?.name || null, message: mapped.message };
  }
}
