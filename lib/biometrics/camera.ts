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

/**
 * FALLBACK NÍVEL 2 — captura de foto pela câmara NATIVA do dispositivo.
 *
 * Usa <input type="file" capture="user">: em telemóveis abre directamente a
 * aplicação de câmara do sistema (SEM getUserMedia — não é afectado pela
 * política de permissões de iframe); em desktop abre o seletor de ficheiros.
 */
export function captureStillViaInput(): Promise<{ dataUrl: string } | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'user'); // câmara frontal nativa em telemóveis
    input.style.position = 'fixed';
    input.style.left = '-9999px';

    let settled = false;
    const finish = (value: { dataUrl: string } | null) => {
      if (!settled) { settled = true; input.remove(); resolve(value); }
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { finish(null); return; }
      const reader = new FileReader();
      reader.onload = () => finish({ dataUrl: String(reader.result) });
      reader.onerror = () => finish(null);
      reader.readAsDataURL(file);
    };
    input.oncancel = () => finish(null);

    document.body.appendChild(input);
    input.click();
    // GC de segurança (5 min)
    setTimeout(() => finish(null), 5 * 60 * 1000);
  });
}

/**
 * Loads a dataURL into an HTMLImageElement ready for model inference.
 */
export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Imagem inválida ou corrompida.'));
    img.src = dataUrl;
  });
}
