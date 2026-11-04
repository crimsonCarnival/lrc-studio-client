import type { AudioFeatures } from './types';

export class AudioFeatureExtractor {
  private rollingBass = 0.2;
  private lastBeatTime = 0;
  private beatEnergy = 0;
  private prefersReducedMotion = false;
  private prevBands = new Float32Array(64);
  private recentBeatTimes: number[] = [];
  private smoothedPace = 0;

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.prefersReducedMotion = media.matches;
        media.addEventListener('change', (e) => {
          this.prefersReducedMotion = e.matches;
        });
      } catch {
        // Fallback for older browsers
      }
    }
  }

  /**
   * Derives normalized audio features from bands (64 bins) and waveform (256 samples).
   */
  public extract(
    bands: Float32Array,
    wave: Float32Array,
    clock: number,
    dt = 0.016,
    active = true,
  ): AudioFeatures {
    if (!active) {
      // Settle smoothly to zero during silence/pause
      this.beatEnergy *= Math.exp(-dt / 0.2);
      this.smoothedPace *= Math.exp(-dt / 0.5);
      return {
        bass: 0,
        mid: 0,
        treble: 0,
        rms: 0,
        spectralCentroid: 0.5,
        beat: false,
        beatEnergy: this.beatEnergy,
        reducedMotion: this.prefersReducedMotion,
        paceMultiplier: 1.0,
        tempoDensity: 0,
      };
    }

    // 1. Frequency Band Ranges
    // Bass: bins 0 - 5 (~40Hz - 250Hz)
    let bassSum = 0;
    for (let i = 0; i <= 5; i++) {
      bassSum += bands[i];
    }
    const bass = bassSum / 6;

    // Mid: bins 6 - 27 (~250Hz - 2.5kHz)
    let midSum = 0;
    for (let i = 6; i <= 27; i++) {
      midSum += bands[i];
    }
    const mid = midSum / 22;

    // Treble: bins 28 - 63 (~2.5kHz - 16kHz)
    let trebleSum = 0;
    for (let i = 28; i < 64; i++) {
      trebleSum += bands[i];
    }
    const treble = trebleSum / 36;

    // 2. RMS Amplitude from Waveform
    let sqSum = 0;
    const waveLen = wave.length;
    for (let j = 0; j < waveLen; j++) {
      const v = wave[j];
      sqSum += v * v;
    }
    const rms = Math.min(1, Math.sqrt(sqSum / waveLen) * 2.0);

    // 3. Spectral Centroid (Timbre Brightness: 0 = dark/sub, 1 = bright/shimmer)
    let weightedSum = 0;
    let totalAmp = 0;
    for (let i = 0; i < 64; i++) {
      const amp = bands[i];
      weightedSum += (i / 63) * amp;
      totalAmp += amp;
    }
    const spectralCentroid = totalAmp > 1e-4 ? weightedSum / totalAmp : 0.5;

    // 4. Beat / Onset Detection
    this.rollingBass += (bass - this.rollingBass) * Math.min(1, dt * 2.5);
    const timeSinceLastBeat = clock - this.lastBeatTime;
    const isBeatThreshold = bass > this.rollingBass * 1.35 + 0.12;
    const beat = isBeatThreshold && timeSinceLastBeat > 0.18; // 330 BPM ceiling

    if (beat) {
      this.lastBeatTime = clock;
      this.beatEnergy = 1.0;
      this.recentBeatTimes.push(clock);
    } else {
      this.beatEnergy = Math.max(0, this.beatEnergy * Math.exp(-dt / 0.22));
    }

    // 5. Fast-Paced Song Part Detection (Beat Density + Spectral Flux)
    // Filter beats from the last 2.4 seconds
    const cutoff = clock - 2.4;
    this.recentBeatTimes = this.recentBeatTimes.filter((t) => t >= cutoff);
    // 6 beats in 2.4s = 150 BPM; 10 beats in 2.4s = 250 BPM
    const beatDensity = Math.min(1.0, this.recentBeatTimes.length / 7.0);

    // High-frequency onset flux (transients from fast hi-hats, arps, fast tempo kicks)
    let fluxSum = 0;
    for (let i = 8; i < 64; i++) {
      const diff = bands[i] - this.prevBands[i];
      if (diff > 0) fluxSum += diff;
      this.prevBands[i] = bands[i];
    }
    const fluxNorm = Math.min(1.0, fluxSum / 3.0);

    // Combined instantaneous pace (fast beats + high transient flux)
    const instantPace = Math.min(1.0, beatDensity * 0.65 + fluxNorm * 0.35);

    // Fast attack, smooth decay
    if (instantPace > this.smoothedPace) {
      this.smoothedPace += (instantPace - this.smoothedPace) * Math.min(1, dt * 4.5);
    } else {
      this.smoothedPace += (instantPace - this.smoothedPace) * Math.min(1, dt * 0.8);
    }

    // Pace multiplier: 1.0 at rest/slow, up to 2.8 on intense fast-paced parts
    const paceMultiplier = 1.0 + this.smoothedPace * 1.8;

    return {
      bass: Math.min(1, bass),
      mid: Math.min(1, mid),
      treble: Math.min(1, treble),
      rms,
      spectralCentroid,
      beat,
      beatEnergy: this.beatEnergy,
      reducedMotion: this.prefersReducedMotion,
      paceMultiplier,
      tempoDensity: this.smoothedPace,
    };
  }
}
