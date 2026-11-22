/**
 * Synthesized Web Audio effects for Aviator
 */
class AviatorAudio {
  constructor() {
    this.ctx = null;
    this.humOsc = null;
    this.humGain = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startFlightSound() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      this.stopFlightSound();
      this.humOsc = this.ctx.createOscillator();
      this.humGain = this.ctx.createGain();

      this.humOsc.type = 'sawtooth';
      this.humOsc.frequency.setValueAtTime(80, this.ctx.currentTime);
      this.humOsc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 8);

      this.humGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.humGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.5);

      this.humOsc.connect(this.humGain);
      this.humGain.connect(this.ctx.destination);
      this.humOsc.start();
    } catch (e) {
      // Audio not permitted yet
    }
  }

  updateFlightPitch(multiplier) {
    if (!this.humOsc || !this.ctx) return;
    try {
      const freq = Math.min(350, 80 + Math.log(multiplier) * 60);
      this.humOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    } catch (e) {}
  }

  stopFlightSound() {
    if (this.humOsc) {
      try {
        this.humOsc.stop();
        this.humOsc.disconnect();
      } catch (e) {}
      this.humOsc = null;
    }
    if (this.humGain) {
      try {
        this.humGain.disconnect();
      } catch (e) {}
      this.humGain = null;
    }
  }

  playCashout() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // High celebratory coin chime
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880.00, now + 0.1); // A5
      osc2.frequency.setValueAtTime(1174.66, now + 0.15); // D6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.1);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {}
  }

  playCrash() {
    this.stopFlightSound();
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopFlightSound();
    return this.muted;
  }
}

export const sound = new AviatorAudio();
