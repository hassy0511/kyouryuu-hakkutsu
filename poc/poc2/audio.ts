// 効果音は仮素材の代わりに WebAudio で合成する(外部アセット不要・ライセンス問題なし)。
// 本実装ではフリー素材 SE に差し替える前提。

export class Sfx {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // iOS Safari は最初のタッチ操作の中で AudioContext を作らないと音が出ない
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const len = this.ctx.sampleRate * 0.3;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private noise(duration: number, freq: number, q: number, gain: number, when = 0): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(g).connect(this.ctx.destination);
    src.start(t);
    src.stop(t + duration);
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    when = 0,
    freqEnd?: number,
  ): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  pick(): void {
    this.noise(0.09, 900, 1.2, 0.5);
    this.tone(150, 0.1, 'triangle', 0.4, 0, 70);
  }

  brush(): void {
    this.noise(0.14, 3200, 0.7, 0.16);
  }

  hint(): void {
    this.tone(880, 0.09, 'sine', 0.3);
    this.tone(1318, 0.16, 'sine', 0.3, 0.09);
  }

  crack(): void {
    this.noise(0.2, 400, 0.8, 0.7);
    this.tone(220, 0.25, 'sawtooth', 0.3, 0, 60);
  }

  fanfare(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.3, i * 0.13));
    this.tone(1047, 0.5, 'triangle', 0.25, notes.length * 0.13);
  }

  fail(): void {
    this.tone(392, 0.25, 'triangle', 0.25);
    this.tone(262, 0.45, 'triangle', 0.25, 0.22);
  }
}
