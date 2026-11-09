import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { readPalette3D } from './visualizer-3d';
import {
  VISUALIZER_2D_PRESETS,
  VISUALIZER_3D_PRESETS,
  VISUALIZER_PRESETS,
  isVisualizerKind,
  isVisualizer3dPreset,
} from './visualizer-presets';
import { startPointerTracker } from './visualizer-pointer';
import { startPointerTracker3D } from './presets-3d/pointer-projector';
import { AudioFeatureExtractor } from './presets-3d/audio-features';

const EXPECTED_3D = [
  'orb',
  'terrain',
  'galaxy',
  'tunnel',
  'pillars',
  'ferrofluid',
  'silk',
  'plasma-globe',
  'urchin',
  'pond',
  'aurora',
  'cymatics',
  'skyline',
  'vinyl',
  'ink',
];

const REMOVED = ['gravity-well', 'ribbons', 'swarm'];

describe('visualizer presets registry', () => {
  it('includes all 2D and 3D presets in the master list', () => {
    expect(VISUALIZER_2D_PRESETS).toEqual(['bars', 'wave', 'radial', 'contour']);
    expect(VISUALIZER_3D_PRESETS).toEqual(EXPECTED_3D);
    expect(VISUALIZER_PRESETS).toEqual([...VISUALIZER_2D_PRESETS, ...VISUALIZER_3D_PRESETS]);
  });

  it('correctly validates visualizer kinds', () => {
    expect(isVisualizerKind('off')).toBe(true);
    expect(isVisualizerKind('bars')).toBe(true);
    for (const id of EXPECTED_3D) expect(isVisualizerKind(id)).toBe(true);
    expect(isVisualizerKind('unknown-kind')).toBe(false);
  });

  // A stored choice of a removed preset must stop validating, so the provider falls back.
  it('rejects removed presets', () => {
    for (const id of REMOVED) {
      expect(isVisualizerKind(id)).toBe(false);
      expect(isVisualizer3dPreset(id)).toBe(false);
    }
  });

  it('correctly distinguishes 3D presets from 2D presets', () => {
    for (const id of EXPECTED_3D) expect(isVisualizer3dPreset(id)).toBe(true);

    expect(isVisualizer3dPreset('bars')).toBe(false);
    expect(isVisualizer3dPreset('wave')).toBe(false);
    expect(isVisualizer3dPreset('radial')).toBe(false);
    expect(isVisualizer3dPreset('contour')).toBe(false);
    expect(isVisualizer3dPreset('off')).toBe(false);
  });
});

describe('readPalette3D', () => {
  const paletteOn = (background: string) => {
    const el = document.createElement('div');
    el.style.setProperty('--background', background);
    document.body.appendChild(el);
    const pal = readPalette3D(el);
    el.remove();
    return pal;
  };

  // Additive blending on a light page adds nothing, so light themes must not get it.
  it('uses additive blending on dark themes and normal on light ones', () => {
    const dark = paletteOn('#232136');
    expect(dark.light).toBe(false);
    expect(dark.blending).toBe(THREE.AdditiveBlending);

    const light = paletteOn('#faf4ed');
    expect(light.light).toBe(true);
    expect(light.blending).toBe(THREE.NormalBlending);
  });

  // The split is themes.ts' luminance rule, so mid-tone palettes (honey, botanical) count as light.
  it('treats mid-tone backgrounds like themes.ts does', () => {
    expect(paletteOn('#f2aa00').light).toBe(true);
    expect(paletteOn('#7b9c98').light).toBe(true);
    expect(paletteOn('#2d394d').light).toBe(false);
  });
});

describe('startPointerTracker', () => {
  it('initializes and stops without throwing', () => {
    const canvas = document.createElement('canvas');
    const tracker = startPointerTracker(canvas);
    expect(tracker.getPointer()).toEqual({ x: 0, y: 0 });
    expect(() => tracker.stop()).not.toThrow();
  });
});

describe('startPointerTracker3D & AudioFeatureExtractor', () => {
  it('tracks 3D pointer and projects to plane and sphere', () => {
    const canvas = document.createElement('canvas');
    const tracker = startPointerTracker3D(canvas);
    const pointer = tracker.getPointer(0, 0.016);
    expect(pointer).toBeDefined();
    expect(typeof pointer.x).toBe('number');
    expect(typeof pointer.y).toBe('number');
    expect(typeof pointer.isIdle).toBe('boolean');
    expect(typeof pointer.idleAmount).toBe('number');
    expect(typeof pointer.projectToPlane).toBe('function');
    expect(typeof pointer.projectToSphere).toBe('function');
    expect(() => tracker.stop()).not.toThrow();
  });

  it('extracts audio features and handles silence/active states', () => {
    const extractor = new AudioFeatureExtractor();
    const bands = new Float32Array(64);
    const wave = new Float32Array(256);

    // Silent / inactive
    const silentFeatures = extractor.extract(bands, wave, 0, 0.016, false);
    expect(silentFeatures.bass).toBe(0);
    expect(silentFeatures.mid).toBe(0);
    expect(silentFeatures.treble).toBe(0);
    expect(silentFeatures.rms).toBe(0);
    expect(silentFeatures.beat).toBe(false);
    expect(silentFeatures.paceMultiplier).toBe(1.0);
    expect(silentFeatures.tempoDensity).toBe(0);

    // Active with energy
    bands.fill(0.5);
    wave.fill(0.3);
    const activeFeatures = extractor.extract(bands, wave, 1.0, 0.016, true);
    expect(activeFeatures.bass).toBeCloseTo(0.5, 1);
    expect(activeFeatures.mid).toBeCloseTo(0.5, 1);
    expect(activeFeatures.treble).toBeCloseTo(0.5, 1);
    expect(activeFeatures.rms).toBeGreaterThan(0);
    expect(typeof activeFeatures.spectralCentroid).toBe('number');
    expect(activeFeatures.paceMultiplier).toBeGreaterThanOrEqual(1.0);
    expect(typeof activeFeatures.tempoDensity).toBe('number');
  });
});
