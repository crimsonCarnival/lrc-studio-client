import { BAND_COUNT, WAVE_SAMPLES } from './visualizer-signal';

export const VISUALIZER_PRESETS = ['bars', 'wave', 'radial'] as const;
export type VisualizerPresetId = (typeof VISUALIZER_PRESETS)[number];
export type VisualizerKind = 'off' | VisualizerPresetId;

export function isVisualizerKind(value: unknown): value is VisualizerKind {
  return value === 'off' || (VISUALIZER_PRESETS as readonly unknown[]).includes(value);
}

interface Frame {
  bands: Float32Array;
  wave: Float32Array;
  /** Mean of all bands, 0..1. */
  level: number;
  /** Mean of the lowest bands, 0..1: drives the pulses. */
  bass: number;
  /** Seconds on the animation clock, for idle motion. */
  clock: number;
  width: number;
  height: number;
  dpr: number;
}

interface Palette {
  primary: string;
  secondary: string;
  tertiary: string;
}

/** Scratch space a preset keeps across frames (falling peak caps). */
interface PresetState {
  peaks?: Float32Array;
}

type Draw = (ctx: CanvasRenderingContext2D, f: Frame, p: Palette, state: PresetState) => void;

const BASS_BANDS = 6;
const TAU = Math.PI * 2;

// Classic spectrum: bars rising from the bottom edge, with peak caps that fall back slowly.
const drawBars: Draw = (ctx, f, p, state) => {
  const { width: w, height: h, bands, dpr } = f;
  const n = bands.length;
  const gap = Math.max(2 * dpr, (w / n) * 0.28);
  const barW = Math.max(1, (w - gap * (n + 1)) / n);
  const maxH = h * 0.45;
  const radius = Math.min(barW / 2, 6 * dpr);
  const peaks = (state.peaks ??= new Float32Array(n));

  const fill = ctx.createLinearGradient(0, h, 0, h - maxH);
  fill.addColorStop(0, p.primary);
  fill.addColorStop(1, p.secondary);
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const v = bands[i] ** 1.5;
    const barH = Math.max(radius * 2, v * maxH);
    ctx.roundRect(gap + i * (barW + gap), h - barH, barW, barH, [radius, radius, 0, 0]);
    peaks[i] = Math.max(v, peaks[i] - 0.008);
  }
  ctx.fill();

  ctx.fillStyle = p.tertiary;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    if (peaks[i] < 0.02) continue;
    ctx.rect(gap + i * (barW + gap), h - peaks[i] * maxH - 6 * dpr, barW, 2 * dpr);
  }
  ctx.fill();
};

// Oscilloscope: the waveform across the middle, with two fainter echoes behind it. Each
// line tapers to the centre at both edges so it never ends in a cut.
const drawWave: Draw = (ctx, f, p) => {
  const { width: w, height: h, wave, dpr, level } = f;
  const mid = h / 2;
  const amp = h * 0.22 * (0.6 + level * 0.8);
  const layers = [
    { color: p.secondary, scale: 0.6, shift: Math.floor(WAVE_SAMPLES / 3), width: 2, alpha: 0.5 },
    { color: p.tertiary, scale: 0.8, shift: Math.floor((WAVE_SAMPLES * 2) / 3), width: 2, alpha: 0.45 },
    { color: p.primary, scale: 1, shift: 0, width: 3, alpha: 1 },
  ];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const layer of layers) {
    ctx.beginPath();
    let prevX = 0;
    let prevY = mid;
    ctx.moveTo(prevX, prevY);
    for (let j = 1; j <= wave.length; j++) {
      const x = (j / wave.length) * w;
      const taper = Math.sin((j / wave.length) * Math.PI);
      const y = mid + wave[(j + layer.shift) % wave.length] * amp * layer.scale * taper;
      ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
      prevX = x;
      prevY = y;
    }
    ctx.lineTo(w, mid);
    ctx.strokeStyle = layer.color;
    // A wide faint pass under the line reads as glow, far cheaper than shadowBlur.
    ctx.globalAlpha = layer.alpha * 0.25;
    ctx.lineWidth = layer.width * 4 * dpr;
    ctx.stroke();
    ctx.globalAlpha = layer.alpha;
    ctx.lineWidth = layer.width * dpr;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

// Circular spectrum: spokes around a ring that swells with the bass, mirrored so the lows
// meet at the top, turning slowly.
const drawRadial: Draw = (ctx, f, p) => {
  const { width: w, height: h, bands, dpr, bass, clock } = f;
  const cx = w / 2;
  const cy = h / 2;
  const m = Math.min(w, h);
  const r = m * 0.16 * (1 + bass * 0.18);
  const len = m * 0.2;
  const n = bands.length;
  const spokes = n * 2;

  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
  glow.addColorStop(0, p.primary);
  glow.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.12 + bass * 0.25;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.9, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  const stroke = ctx.createRadialGradient(cx, cy, r, cx, cy, r + len);
  stroke.addColorStop(0, p.primary);
  stroke.addColorStop(1, p.secondary);
  ctx.strokeStyle = stroke;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2 * dpr, ((TAU * r) / spokes) * 0.45);
  ctx.beginPath();
  const r0 = r + 4 * dpr;
  for (let k = 0; k < spokes; k++) {
    const v = bands[k < n ? k : spokes - 1 - k] ** 1.2;
    const a = -Math.PI / 2 + clock * 0.08 + (k / spokes) * TAU;
    const r1 = r0 + Math.max(2 * dpr, v * len);
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
  }
  ctx.stroke();

  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = p.tertiary;
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1, r - 3 * dpr), 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
};

const DRAW: Record<VisualizerPresetId, Draw> = { bars: drawBars, wave: drawWave, radial: drawRadial };

// Theme tokens, so the presets follow the dark and light themes like the rest of the stage.
function readPalette(el: Element): Palette {
  const style = getComputedStyle(el);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    primary: token('--color-primary', '#c4a7e7'),
    secondary: token('--color-accent-blue', '#9ccfd8'),
    tertiary: token('--color-love', '#eb6f92'),
  };
}

/**
 * Fills `bands` and `wave` for this frame. Returns whether something is playing: once it
 * returns false and the bands have decayed to nothing, the loop stops painting.
 */
export type Sampler = (bands: Float32Array, wave: Float32Array, clock: number) => boolean;

/** Animates a preset on a canvas until the returned function is called. */
export function startVisualizer(canvas: HTMLCanvasElement, preset: VisualizerPresetId, sample: Sampler): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const draw = DRAW[preset];
  const state: PresetState = {};
  const targetBands = new Float32Array(BAND_COUNT);
  const targetWave = new Float32Array(WAVE_SAMPLES);
  const bands = new Float32Array(BAND_COUNT);
  const wave = new Float32Array(WAVE_SAMPLES);
  let palette = readPalette(canvas);
  let dpr = 1;
  let frames = 0;
  let resting = false;

  const fit = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    // Resizing wipes the bitmap; paint again even if the loop was resting.
    resting = false;
  };
  fit();
  const observer = new ResizeObserver(fit);
  observer.observe(canvas);

  let raf = requestAnimationFrame(function tick(now) {
    raf = requestAnimationFrame(tick);
    const clock = now / 1000;
    const active = sample(targetBands, targetWave, clock);

    let peak = 0;
    let sum = 0;
    let bassSum = 0;
    for (let i = 0; i < BAND_COUNT; i++) {
      const v = targetBands[i];
      // Rise fast, fall slowly: reads as rhythm rather than flicker.
      bands[i] += (v - bands[i]) * (v > bands[i] ? 0.6 : 0.12);
      peak = Math.max(peak, bands[i]);
      sum += bands[i];
      if (i < BASS_BANDS) bassSum += bands[i];
    }
    for (let j = 0; j < WAVE_SAMPLES; j++) wave[j] += (targetWave[j] - wave[j]) * 0.5;

    if (!active && peak < 0.004) {
      if (!resting) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        resting = true;
      }
      return;
    }
    resting = false;
    // Re-read the tokens now and then, so a theme switch reaches a running visualizer.
    if (++frames % 60 === 0) palette = readPalette(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw(ctx, {
      bands,
      wave,
      level: sum / BAND_COUNT,
      bass: bassSum / BASS_BANDS,
      clock,
      width: canvas.width,
      height: canvas.height,
      dpr,
    }, palette, state);
  });

  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
  };
}
