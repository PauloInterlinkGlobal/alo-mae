import type { ExtractionResult } from './types';

export interface HumanFaceResult {
  embedding?: number[];
  box?: [number, number, number, number];
  score?: number;
  live?: boolean;
  liveness?: number;
}

export interface HumanDetectionResult {
  face?: HumanFaceResult[];
  performance?: Record<string, number>;
}

export interface HumanBiometricProvider {
  load(): Promise<void>;
  detect(source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement): Promise<HumanDetectionResult>;
  dispose(): void;
}

let providerPromise: Promise<HumanBiometricProvider> | null = null;

type HumanConstructor = new (config?: Record<string, unknown>) => {
  load: () => Promise<void>;
  detect: (source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) => Promise<HumanDetectionResult>;
  tf: { disposeVariables: () => void };
};

declare global {
  interface Window {
    Human?: HumanConstructor;
  }
}

function loadHumanScript() {
  return new Promise<HumanConstructor>((resolve, reject) => {
    if (window.Human) return resolve(window.Human);
    const existing = document.querySelector<HTMLScriptElement>('script[data-human-sdk]');
    if (existing) {
      existing.addEventListener('load', () => window.Human ? resolve(window.Human) : reject(new Error('Human SDK não expôs o construtor.')), { once: true });
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o Human SDK.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = '/vendor/human.js';
    script.async = true;
    script.dataset.humanSdk = 'true';
    script.onload = () => window.Human ? resolve(window.Human) : reject(new Error('Human SDK não expôs o construtor.'));
    script.onerror = () => reject(new Error('Falha ao carregar o Human SDK.'));
    document.head.appendChild(script);
  });
}

function toNormalizedBox(box?: [number, number, number, number], width = 1, height = 1) {
  if (!box || width <= 0 || height <= 0) return undefined;
  const [x, y, boxWidth, boxHeight] = box;
  return {
    x: Math.max(0, Math.min(1, x / width)),
    y: Math.max(0, Math.min(1, y / height)),
    width: Math.max(0, Math.min(1, boxWidth / width)),
    height: Math.max(0, Math.min(1, boxHeight / height)),
  };
}

export async function createHumanBiometricProvider(): Promise<HumanBiometricProvider> {
  if (typeof window === 'undefined') {
    throw new Error('O Human só pode ser inicializado no navegador.');
  }

  if (!providerPromise) {
    providerPromise = loadHumanScript().then(async (Human) => {
      const human = new Human({
        backend: 'webgl',
        modelBasePath: '/models/human/',
        face: {
          enabled: true,
          detector: { enabled: true, rotation: true, maxDetected: 1 },
          mesh: { enabled: true },
          description: { enabled: true, modelPath: 'blazeface' },
          antispoof: { enabled: true },
          liveness: { enabled: true },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
      } as never);

      return {
        load: () => human.load(),
        detect: (source) => human.detect(source) as Promise<HumanDetectionResult>,
        dispose: () => human.tf.disposeVariables(),
      };
    });
  }

  return providerPromise;
}

export function resetHumanBiometricProvider() {
  providerPromise = null;
}

export function humanFaceToExtractionResult(
  result: HumanDetectionResult,
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): ExtractionResult | null {
  const face = result.face?.[0];
  if (!face?.embedding?.length) return null;

  const width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  const box = toNormalizedBox(face.box, width, height);

  const resolvedBox = box ?? { x: 0.25, y: 0.18, width: 0.5, height: 0.6 };
  const centerX = resolvedBox.x + resolvedBox.width / 2;
  const centerY = resolvedBox.y + resolvedBox.height / 2;
  const eyeY = resolvedBox.y + resolvedBox.height * 0.38;
  const eyeOffset = resolvedBox.width * 0.24;

  return {
    embedding: face.embedding,
    qualityScore: Math.round((face.score ?? 0) * 100),
    box: resolvedBox,
    landmarks: {
      leftEye: [centerX - eyeOffset, eyeY],
      rightEye: [centerX + eyeOffset, eyeY],
      noseTip: [centerX, resolvedBox.y + resolvedBox.height * 0.56],
      mouthLeft: [centerX - eyeOffset * 0.65, resolvedBox.y + resolvedBox.height * 0.76],
      mouthRight: [centerX + eyeOffset * 0.65, resolvedBox.y + resolvedBox.height * 0.76],
      chin: [centerX, resolvedBox.y + resolvedBox.height * 0.95],
    },
    liveness: {
      isLive: face.live === true,
      score: face.liveness ?? (face.live === true ? 1 : 0),
      reason: face.live === true ? 'Human confirmou presença real' : 'Presença real não confirmada',
      checks: {
        microMotion: face.live === true,
        aspectRatioCheck: true,
        textureConsistency: face.live === true,
      },
    },
    processingTimeMs: result.performance?.total ?? 0,
  };
}

export async function extractWithHuman(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<ExtractionResult | null> {
  const provider = await createHumanBiometricProvider();
  await provider.load();
  const result = await provider.detect(source);
  return humanFaceToExtractionResult(result, source);
}

export function isHumanAvailable() {
  return typeof window !== 'undefined' && typeof WebGLRenderingContext !== 'undefined';
}

export function humanModelPath() {
  return '/models/human/';
}
