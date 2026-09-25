/**
 * CameraService — abstração de câmara (ADR 0005).
 *
 * Duas capacidades distintas, cada uma com implementações permutáveis:
 *
 *   1. LIVE STREAM (reconhecimento facial contínuo do terminal)
 *      - web-live:   getUserMedia (navegador/WebView Capacitor)
 *      - native-live: plugin nativo Android (CameraX) — Fase Android
 *
 *   2. STILL CAPTURE (foto única: fallback do terminal, enrolamento)
 *      - web-still:   <input capture="user"> (funciona em iframe, sem getUserMedia)
 *      - native-still: @capacitor/camera takePhoto() — Fase Android
 *
 * Nota verificada (2026-09, docs oficiais @capacitor/camera): no Web o
 * takePhoto usa o modal PWA (getUserMedia → mesmo bloqueio de iframe) e, sem
 * PWA elements, cai para um picker <input> — equivalente ao nosso web-still.
 * Por isso o plugin só entra quando existir runtime nativo.
 *
 * ⚠️ @capacitor/camera NUNCA substitui o stream contínuo do reconhecimento
 * (takePhoto por frame = arquitetura errada); é API de captura de fotos.
 */
import {
  requestCameraStream, captureStillViaInput, isSecureEnough, CameraErrorKind,
} from './camera';

export interface LiveCameraProvider {
  id: 'native-live' | 'web-live';
  isAvailable(): Promise<boolean>;
  getStream(): Promise<{ stream: MediaStream | null; errorName: string | null; errorKind: CameraErrorKind | null; message: string }>;
}

export interface StillCameraProvider {
  id: 'native-still' | 'web-still';
  isAvailable(): Promise<boolean>;
  capture(): Promise<{ dataUrl: string } | null>;
}

function isNativeCapacitor(): boolean {
  try {
    const cap = (window as any).Capacitor;
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Implementação Web                                                   */
/* ------------------------------------------------------------------ */

export const webLiveProvider: LiveCameraProvider = {
  id: 'web-live',
  async isAvailable() {
    return typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      isSecureEnough();
  },
  async getStream() {
    const res = await requestCameraStream();
    return { stream: res.stream, errorName: res.errorName, errorKind: res.errorKind, message: res.message };
  },
};

export const webStillProvider: StillCameraProvider = {
  id: 'web-still',
  async isAvailable() {
    return typeof document !== 'undefined';
  },
  async capture() {
    return captureStillViaInput();
  },
};

/* ------------------------------------------------------------------ */
/* Stubs nativos — activam-se na Fase Android (ADR 0005 §3)            */
/* ------------------------------------------------------------------ */

export const nativeLiveProvider: LiveCameraProvider = {
  id: 'native-live',
  async isAvailable() {
    // Fase Android: plugin Capacitor próprio (CameraX) com preview contínuo.
    return isNativeCapacitor() && !!(window as any).AloMaeNativeCamera;
  },
  async getStream() {
    return {
      stream: null,
      errorName: 'NativeNotImplemented',
      errorKind: 'unknown' as CameraErrorKind,
      message: 'Câmara nativa contínua ainda não implementada (Fase Android).',
    };
  },
};

export const nativeStillProvider: StillCameraProvider = {
  id: 'native-still',
  async isAvailable() {
    // Fase Android: instalar @capacitor/camera e chamar takePhoto() aqui.
    return isNativeCapacitor() && !!(window as any).Capacitor?.Plugins?.Camera;
  },
  async capture() {
    const Camera = (window as any).Capacitor?.Plugins?.Camera;
    if (!Camera) return null;
    const photo = await Camera.takePhoto({ quality: 90 });
    // MediaResult → dataURL (via webPath fetch) — implementado na Fase Android
    if (!photo?.webPath) return null;
    const blob = await (await fetch(photo.webPath)).blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: String(reader.result) });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  },
};

/* ------------------------------------------------------------------ */
/* Resolução: nativo primeiro, web como fallback                       */
/* ------------------------------------------------------------------ */

export async function resolveLiveProvider(): Promise<LiveCameraProvider> {
  if (await nativeLiveProvider.isAvailable()) return nativeLiveProvider;
  return webLiveProvider;
}

export async function resolveStillProvider(): Promise<StillCameraProvider> {
  if (await nativeStillProvider.isAvailable()) return nativeStillProvider;
  return webStillProvider;
}
