export interface BiometricProfile {
  enrolled: boolean;
  enrolledAt: string;
  algorithm: 'mobilefacenet-v1' | 'local-neural-geometry-v1';
  embedding: number[]; // 128-dimensional normalized facial feature vector
  vectorDimension: number; // 128
  qualityScore: number; // 0 - 100
  livenessBaseline?: {
    aspectRatio: number;
    eyeDistanceRatio: number;
    mouthNoseRatio: number;
    jawSymmetry: number;
  };
  featureHash: string; // Cryptographic representation/hash for audit (without storing raw photo)
  active: boolean;
  version: string;
  lastMatchedAt?: string;
  enrollmentDeviceId?: string;
}

export interface DetectedFaceLandmarks {
  leftEye: [number, number];
  rightEye: [number, number];
  noseTip: [number, number];
  mouthLeft: [number, number];
  mouthRight: [number, number];
  chin: [number, number];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LivenessCheckResult {
  isLive: boolean;
  score: number; // 0 to 1
  reason: string;
  checks: {
    microMotion: boolean;
    aspectRatioCheck: boolean;
    textureConsistency: boolean;
    eyeBlink?: boolean;
  };
}

export interface ExtractionResult {
  embedding: number[];
  qualityScore: number;
  box: BoundingBox;
  landmarks: DetectedFaceLandmarks;
  liveness: LivenessCheckResult;
  processingTimeMs: number;
}

export interface BiometricMatchResult {
  isMatch: boolean;
  studentId: string;
  studentName: string;
  matricula: string;
  className: string;
  similarity: number; // 0 to 1
  confidencePercentage: number; // 0% to 100%
  threshold: number;
  matchDurationMs: number;
  livenessPassed: boolean;
  verifiedLocation: boolean;
}
