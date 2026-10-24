import { describe, expect, it } from 'vitest';
import {
  BAND_COUNT, WAVE_SAMPLES, beatPulse, buildBeatTimes, fftToBands, fillSimulated, simulatedEnergy, timeDomainToWave,
} from './visualizer-signal';

describe('fftToBands', () => {
  it('puts a single tone in a low band and leaves the top silent', () => {
    // 1024 bins at 48 kHz is ~23.4 Hz per bin; bin 4 is ~94 Hz.
    const fft = new Uint8Array(1024);
    fft[4] = 255;
    const bands = new Float32Array(BAND_COUNT);
    fftToBands(fft, 48000, bands);

    const loudest = bands.indexOf(Math.max(...bands));
    expect(loudest).toBeLessThan(BAND_COUNT / 4);
    expect(bands[BAND_COUNT - 1]).toBe(0);
  });

  it('never exceeds 1, even with the high-end tilt', () => {
    const bands = new Float32Array(BAND_COUNT);
    fftToBands(new Uint8Array(1024).fill(255), 48000, bands);
    expect(Math.max(...bands)).toBeLessThanOrEqual(1);
  });
});

describe('timeDomainToWave', () => {
  it('starts the window on a rising zero crossing', () => {
    const bytes = new Uint8Array(2048);
    // A sine that begins a third of the way into a cycle, so index 0 is not the crossing.
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.round(128 + 100 * Math.sin((i + 30) / 15));
    const wave = new Float32Array(WAVE_SAMPLES);
    timeDomainToWave(bytes, wave);

    expect(Math.abs(wave[0])).toBeLessThan(0.1);
    expect(wave[2]).toBeGreaterThan(wave[0]);
  });
});

describe('buildBeatTimes', () => {
  it('collects line and word times, sorted, skipping sections and near-duplicates', () => {
    const beats = buildBeatTimes([
      { type: 'section', timestamp: 0 },
      { timestamp: 5, words: [{ time: 5.02 }, { time: 5.6 }, { time: null }] },
      { timestamp: 2 },
      { timestamp: null },
    ]);
    expect(beats).toEqual([2, 5, 5.6]);
  });
});

describe('beatPulse', () => {
  const beats = [1, 3];

  it('is 0 before the first beat and 1 right on one', () => {
    expect(beatPulse(beats, 0.5)).toBe(0);
    expect(beatPulse(beats, 1)).toBe(1);
    expect(beatPulse(beats, 3)).toBe(1);
  });

  it('decays after a beat', () => {
    expect(beatPulse(beats, 1.5)).toBeLessThan(beatPulse(beats, 1.1));
  });

  it('handles a song with no beats', () => {
    expect(beatPulse([], 10)).toBe(0);
    expect(simulatedEnergy([], 10)).toBeGreaterThan(0);
  });
});

describe('fillSimulated', () => {
  it('is silent at zero energy and stays within range at full energy', () => {
    const bands = new Float32Array(BAND_COUNT);
    const wave = new Float32Array(WAVE_SAMPLES);
    fillSimulated(bands, wave, 12.3, 0);
    expect(Math.max(...bands)).toBe(0);
    expect(Math.max(...wave.map(Math.abs))).toBe(0);

    fillSimulated(bands, wave, 12.3, 1);
    expect(Math.max(...bands)).toBeGreaterThan(0);
    expect(Math.max(...bands)).toBeLessThanOrEqual(1);
    expect(Math.max(...wave.map(Math.abs))).toBeLessThanOrEqual(1);
  });
});
