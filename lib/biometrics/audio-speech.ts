/**
 * Audio feedback and voice synthesis for touchless school kiosk.
 * Uses Web Audio API for offline zero-latency synthesized chimes
 * and Web Speech API for voice confirmations in Portuguese.
 */

class BiometricAudioSystem {
  private audioCtx: AudioContext | null = null;
  private voiceEnabled: boolean = true;
  private soundEnabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on first user interaction or call
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setVoiceEnabled(val: boolean) {
    this.voiceEnabled = val;
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setSoundEnabled(val: boolean) {
    this.soundEnabled = val;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Harmonious two-tone success chord (A5 880Hz -> C#6 1108Hz -> E6 1318Hz)
   */
  public playSuccessChime() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [880, 1108.73, 1318.51]; // A-major triad

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.55);
      });
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Soft caution chime (e.g. face unaligned or cooldown active)
   */
  public playWarningBeep() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(350, now + 0.1);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Fallback
    }
  }

  /**
   * Speaks Portuguese confirmation message to student hands-free
   */
  public speakAttendanceConfirmation(
    studentName: string,
    type: 'entry' | 'exit' | 'ENTRADA' | 'SAIDA_TEMPORARIA' | 'RETORNO' | 'SAIDA_OFICIAL'
  ) {
    if (!this.voiceEnabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech

      const firstName = studentName.split(' ')[0] || 'Aluno';
      let text = '';
      if (type === 'entry' || type === 'ENTRADA') {
        text = `Presença registada! Bem-vindo, ${firstName}.`;
      } else if (type === 'SAIDA_TEMPORARIA') {
        text = `Saída temporária autorizada, ${firstName}.`;
      } else if (type === 'RETORNO') {
        text = `Retorno confirmado, bem-vindo de volta ${firstName}.`;
      } else {
        text = `Saída oficial registada! Até amanhã, ${firstName}.`;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-PT';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Try selecting Portuguese voice if available in browser
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(
        (v) => v.lang.startsWith('pt') || v.name.toLowerCase().includes('portuguese')
      );
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }
}

export const biometricAudio = new BiometricAudioSystem();
