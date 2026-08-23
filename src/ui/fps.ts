export class FpsMeter {
  private frames = 0;
  private windowStart = performance.now();
  private samples: number[] = [];
  private warmupLeft = 2;

  constructor(
    private fpsEl: HTMLElement,
    private msEl: HTMLElement,
    private minEl: HTMLElement,
  ) {}

  // 0.5秒ごとに表示を更新し、更新したときだけ fps を返す
  tick(): number | null {
    this.frames++;
    const now = performance.now();
    const elapsed = now - this.windowStart;
    if (elapsed < 500) return null;

    const fps = (this.frames * 1000) / elapsed;
    this.frames = 0;
    this.windowStart = now;

    // 起動直後の読み込みスパイクは「さいてい FPS」の集計から外す
    if (this.warmupLeft > 0) {
      this.warmupLeft--;
    } else {
      this.samples.push(fps);
      if (this.samples.length > 20) this.samples.shift();
      this.minEl.textContent = Math.min(...this.samples).toFixed(0);
    }

    this.fpsEl.textContent = fps.toFixed(0);
    this.fpsEl.style.color = fps >= 50 ? '#6adf6a' : fps >= 30 ? '#ffd75e' : '#ff6b6b';
    this.msEl.textContent = (1000 / fps).toFixed(1);
    return fps;
  }
}
