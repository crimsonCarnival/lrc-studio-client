// Every visualizer preset draws from the same two arrays: log-spaced bands (0..1, low to
// high) and a waveform (-1..1). Two producers fill them — a real AnalyserNode, and a
// stand-in driven by the lyric timestamps for media whose audio the page cannot read
// (a YouTube embed before the viewer shares the tab's audio).

export const BAND_COUNT = 64;
export const WAVE_SAMPLES = 256;

const MIN_HZ = 40;
const MAX_HZ = 16000;

/** Collapses an FFT magnitude array (getByteFrequencyData) into log-spaced bands. */
export function fftToBands(fft: Uint8Array, sampleRate: number, out: Float32Array): void {
  const binHz = sampleRate / 2 / fft.length;
  const n = out.length;
  const ratio = MAX_HZ / MIN_HZ;
  for (let i = 0; i < n; i++) {
    const lo = Math.floor((MIN_HZ * ratio ** (i / n)) / binHz);
    const hi = Math.max(lo, Math.floor((MIN_HZ * ratio ** ((i + 1) / n)) / binHz) - 1);
    let peak = 0;
    for (let b = lo; b <= hi && b < fft.length; b++) if (fft[b] > peak) peak = fft[b];
    // Highs carry far less energy than lows; a gentle tilt keeps the top end from flatlining.
    out[i] = Math.min(1, (peak / 255) * (1 + 0.5 * (i / n)));
  }
}

/**
 * Time-domain bytes (getByteTimeDomainData, centred on 128) resampled to -1..1. The window
 * starts on a rising zero crossing, an oscilloscope's trigger, so the trace holds still
 * instead of sliding sideways every frame.
 */
export function timeDomainToWave(bytes: Uint8Array, out: Float32Array): void {
  const span = Math.floor(bytes.length / 2);
  let start = 0;
  for (let i = 1; i < bytes.length - span; i++) {
    if (bytes[i - 1] < 128 && bytes[i] >= 128) { start = i; break; }
  }
  const step = span / out.length;
  for (let j = 0; j < out.length; j++) out[j] = (bytes[start + Math.floor(j * step)] - 128) / 128;
}

interface TimedLine {
  type?: string;
  timestamp?: number | null;
  words?: { time?: number | null }[] | null;
}

/** Every line start and word time, sorted: the moments the stand-in pulses on. */
export function buildBeatTimes(lines: readonly TimedLine[]): number[] {
  const times: number[] = [];
  for (const line of lines) {
    if (line.type === 'section') continue;
    if (line.timestamp != null) times.push(line.timestamp);
    for (const word of line.words ?? []) if (word.time != null) times.push(word.time);
  }
  times.sort((a, b) => a - b);
  return times.filter((t, i) => i === 0 || t - times[i - 1] > 0.05);
}

// Seconds for a pulse to fall to ~37%.
const PULSE_DECAY = 0.28;

/** 1 right on a beat, decaying towards 0 until the next one; 0 before the first. */
export function beatPulse(beats: readonly number[], time: number): number {
  let lo = 0;
  let hi = beats.length - 1;
  let last = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (beats[mid] <= time) { last = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return last < 0 ? 0 : Math.exp(-(time - beats[last]) / PULSE_DECAY);
}

/** Loudness (0..1) the stand-in plays at, at this point of the song. */
export function simulatedEnergy(beats: readonly number[], songTime: number): number {
  // Instrumental stretches and unsynced songs have no beats; a steady ~120 BPM throb keeps
  // the background alive through them without pretending to be the real rhythm.
  const throb = 0.5 + 0.5 * Math.cos(songTime * Math.PI * 4);
  return 0.3 + 0.7 * Math.max(beatPulse(beats, songTime), throb * 0.45);
}

/** The stand-in: a plausible spectrum and waveform whose loudness follows `energy`. */
export function fillSimulated(bands: Float32Array, wave: Float32Array, clock: number, energy: number): void {
  const n = bands.length;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    // Music leans to the low end, and the lowest bands carry the kick.
    const shape = 0.95 - 0.6 * x;
    const wobble = 0.55 + 0.45 * Math.sin(clock * (1.1 + x * 3.7) + i * 1.9) * Math.sin(clock * 0.63 + i * 0.37);
    const kick = x < 0.2 ? energy * 0.35 * (1 - x / 0.2) : 0;
    bands[i] = Math.min(1, Math.max(0, shape * wobble * energy + kick));
  }
  const m = wave.length;
  for (let j = 0; j < m; j++) {
    const x = j / m;
    wave[j] = energy * 0.7 * (
      0.55 * Math.sin(2 * Math.PI * (x * 3 + clock * 0.9))
      + 0.3 * Math.sin(2 * Math.PI * (x * 7.3 - clock * 1.7))
      + 0.15 * Math.sin(2 * Math.PI * (x * 17 + clock * 3.1))
    );
  }
}
