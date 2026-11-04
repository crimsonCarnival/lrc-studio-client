import { describe, expect, it } from 'vitest';
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

describe('visualizer presets registry', () => {
  it('includes all 2D and 3D presets in the master list', () => {
    expect(VISUALIZER_2D_PRESETS).toEqual(['bars', 'wave', 'radial', 'contour']);
    expect(VISUALIZER_3D_PRESETS).toEqual([
      'orb',
      'terrain',
      'galaxy',
      'tunnel',
      'pillars',
      'ferrofluid',
      'gravity-well',
      'silk',
      'plasma-globe',
      'ribbons',
      'swarm',
      'urchin',
      'pond',
    ]);
    expect(VISUALIZER_PRESETS).toEqual([...VISUALIZER_2D_PRESETS, ...VISUALIZER_3D_PRESETS]);
  });

  it('correctly validates visualizer kinds', () => {
    expect(isVisualizerKind('off')).toBe(true);
    expect(isVisualizerKind('bars')).toBe(true);
    expect(isVisualizerKind('orb')).toBe(true);
    expect(isVisualizerKind('terrain')).toBe(true);
    expect(isVisualizerKind('galaxy')).toBe(true);
    expect(isVisualizerKind('tunnel')).toBe(true);
    expect(isVisualizerKind('pillars')).toBe(true);
    expect(isVisualizerKind('ferrofluid')).toBe(true);
    expect(isVisualizerKind('gravity-well')).toBe(true);
    expect(isVisualizerKind('silk')).toBe(true);
    expect(isVisualizerKind('plasma-globe')).toBe(true);
    expect(isVisualizerKind('ribbons')).toBe(true);
    expect(isVisualizerKind('swarm')).toBe(true);
    expect(isVisualizerKind('urchin')).toBe(true);
    expect(isVisualizerKind('pond')).toBe(true);
    expect(isVisualizerKind('unknown-kind')).toBe(false);
  });

  it('correctly distinguishes 3D presets from 2D presets', () => {
    expect(isVisualizer3dPreset('orb')).toBe(true);
    expect(isVisualizer3dPreset('terrain')).toBe(true);
    expect(isVisualizer3dPreset('galaxy')).toBe(true);
    expect(isVisualizer3dPreset('tunnel')).toBe(true);
    expect(isVisualizer3dPreset('pillars')).toBe(true);
    expect(isVisualizer3dPreset('ferrofluid')).toBe(true);
    expect(isVisualizer3dPreset('gravity-well')).toBe(true);
    expect(isVisualizer3dPreset('silk')).toBe(true);
    expect(isVisualizer3dPreset('plasma-globe')).toBe(true);
    expect(isVisualizer3dPreset('ribbons')).toBe(true);
    expect(isVisualizer3dPreset('swarm')).toBe(true);
    expect(isVisualizer3dPreset('urchin')).toBe(true);
    expect(isVisualizer3dPreset('pond')).toBe(true);

    expect(isVisualizer3dPreset('bars')).toBe(false);
    expect(isVisualizer3dPreset('wave')).toBe(false);
    expect(isVisualizer3dPreset('radial')).toBe(false);
    expect(isVisualizer3dPreset('contour')).toBe(false);
    expect(isVisualizer3dPreset('off')).toBe(false);
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
