/**
 * Real on-device facial recognition engine — ADR 0003 (Plano A: Human).
 *
 * Pipeline (todos os modelos bundled em /public/models — 100% offline):
 *   BlazeFace (detecção, Apache-2.0)
 *   → FaceMesh (alinhamento/landmarks, Apache-2.0)
 *   → MobileFace/BecauseofAI (embedding 112×112, MIT)
 *   → Antispoof + Liveness (Human, experimentais — scores reportados no POC)
 *
 * Nenhum frame/imagem é persistido: apenas embeddings, na galeria local
 * (IndexedDB) e, quando aplicável, no perfil biométrico cifrado.
 */

export interface HumanFaceCapture {
  embedding: number[];
  detectionScore: number;
  antispoofScore: number | null;
  liveScore: number | null;
  box: { xMin: number; yMin: number; xMax: number; yMax: number };
  width: number;
  height: number;
}

export interface HumanEngineStatus {
  loaded: boolean;
  backend: string;
  embeddingModel: string;
  error: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyHuman = any;

let humanInstance: AnyHuman | null = null;
let humanLoading: Promise<AnyHuman> | null = null;
let engineStatus: HumanEngineStatus = {
  loaded: false,
  backend: '-',
  embeddingModel: '-',
  error: null,
};

export function getEngineStatus(): HumanEngineStatus {
  return { ...engineStatus };
}

/**
 * Loads and configures the Human library (singleton).
 * Dynamic import keeps SSR/Next build safe — only browsers load TFJS.
 */
export async function loadHumanEngine(): Promise<AnyHuman> {
  if (humanInstance) return humanInstance;
  if (humanLoading) return humanLoading;

  humanLoading = (async () => {
    try {
      const mod: AnyHuman = await import('@vladmandic/human');
      const HumanCtor = mod.default || mod.Human || mod;

      const human = new HumanCtor({
        debug: false,
        backend: 'webgl',
        wasmPath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/dist/',
        modelBasePath: '/models/',
        cacheModels: true,
        // Só o módulo facial — economiza RAM em tablets 2–4 GB
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false },
        face: {
          enabled: true,
          detector: { modelPath: 'blazeface.json', maxDetected: 3, minConfidence: 0.5 },
          mesh: { enabled: true, modelPath: 'facemesh.json' },
          iris: { enabled: false },
          // Embedding MIT (BecauseofAI MobileFace) — decisão ADR 0003
          description: { enabled: true, modelPath: 'mobileface.json' },
          // Anti-spoofing / liveness experimentais (Human) — POC mede os scores
          antispoof: { enabled: true, modelPath: 'antispoof.json' },
          liveness: { enabled: true, modelPath: 'liveness.json' },
          age: { enabled: false },
          gender: { enabled: false },
          emotion: { enabled: false },
          gear: { enabled: false },
        },
      });

      await human.load();
      await human.warmup();

      engineStatus = {
        loaded: true,
        backend: human.backend || 'webgl',
        // Confirma qual modelo de embedding ficou ativo
        embeddingModel: String(human.models()?.description?.modelUrl || 'mobileface.json').split('/').pop() || 'mobileface',
        error: null,
      };

      humanInstance = human;
      return human;
    } catch (err: any) {
      engineStatus = { ...engineStatus, error: err?.message || String(err) };
      humanLoading = null;
      throw err;
    }
  })();

  return humanLoading;
}

/**
 * Detects the strongest face in a video frame and extracts the embedding.
 * Returns null when no reliable face is present.
 */
export async function detectFace(video: HTMLVideoElement): Promise<HumanFaceCapture | null> {
  const human = await loadHumanEngine();
  if (!video.videoWidth) return null;

  const result: AnyHuman = await human.detect(video);

  const faces: AnyHuman[] = result?.face || [];
  if (faces.length === 0) return null;

  // Face com maior score de detecção
  const best = faces.reduce((a, b) => ((a.boxScore || 0) >= (b.boxScore || 0) ? a : b));
  if (!best || !best.embedding || best.embedding.length === 0) return null;
  if ((best.boxScore || 0) < 0.5) return null;

  return {
    embedding: Array.from(best.embedding as ArrayLike<number>),
    detectionScore: best.boxScore || 0,
    antispoofScore: typeof best.antispoof === 'number' ? best.antispoof : null,
    liveScore: typeof best.live === 'number' ? best.live : null,
    box: {
      xMin: best.box[0],
      yMin: best.box[1],
      xMax: best.box[2],
      yMax: best.box[3],
    },
    width: video.videoWidth,
    height: video.videoHeight,
  };
}
