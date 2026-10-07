/**
 * Web Audio API synthesizer for the default WakeWay alarm chime
 * and audio element player for custom audio files.
 */
class WakeWayAudioEngine {
  private audioCtx: AudioContext | null = null;
  private customAudio: HTMLAudioElement | null = null;
  private isLooping = false;
  private timerId: number | null = null;

  private initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Synthesizes a loud, waking chime harmonic
   */
  private playChimeBurst() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    chords.forEach((freq, index) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      gain.gain.setValueAtTime(0.001, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.3, now + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);

      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.7);
    });
  }

  startAlarm(customAudioUrl: string | null) {
    this.stop();
    this.isLooping = true;

    if (customAudioUrl) {
      try {
        this.customAudio = new Audio(customAudioUrl);
        this.customAudio.loop = true;
        this.customAudio.volume = 1.0;
        this.customAudio.play().catch(() => {
          // Fallback to synthesized audio if custom URL cannot autoplay
          this.startSynthesizedLoop();
        });
        return;
      } catch {
        // Fallback
      }
    }

    this.startSynthesizedLoop();
  }

  private startSynthesizedLoop() {
    this.initContext();
    this.playChimeBurst();
    this.timerId = window.setInterval(() => {
      if (!this.isLooping) return;
      this.playChimeBurst();
    }, 1200);
  }

  playPreview(customAudioUrl: string | null, onFinish?: () => void) {
    this.stop();
    if (customAudioUrl) {
      this.customAudio = new Audio(customAudioUrl);
      this.customAudio.volume = 1.0;
      this.customAudio.play().catch(() => {
        this.playSynthesizedBurstOnce(onFinish);
      });
      this.customAudio.onended = () => {
        if (onFinish) onFinish();
      };
      this.timerId = window.setTimeout(() => {
        this.stop();
        if (onFinish) onFinish();
      }, 5000);
    } else {
      this.playSynthesizedBurstOnce(onFinish);
    }
  }

  private playSynthesizedBurstOnce(onFinish?: () => void) {
    this.initContext();
    this.playChimeBurst();
    window.setTimeout(() => {
      this.playChimeBurst();
    }, 600);
    window.setTimeout(() => {
      this.stop();
      if (onFinish) onFinish();
    }, 2000);
  }

  stop() {
    this.isLooping = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.customAudio) {
      try {
        this.customAudio.pause();
        this.customAudio.currentTime = 0;
      } catch {
        // Ignore
      }
      this.customAudio = null;
    }
  }
}

export const audioEngine = new WakeWayAudioEngine();
