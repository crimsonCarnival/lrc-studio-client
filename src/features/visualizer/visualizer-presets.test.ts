import { describe, expect, it } from 'vitest';
import {
  VISUALIZER_2D_PRESETS,
  VISUALIZER_3D_PRESETS,
  VISUALIZER_PRESETS,
  isVisualizerKind,
  isVisualizer3dPreset,
} from './visualizer-presets';
import { startPointerTracker } from './visualizer-pointer';

describe('visualizer presets registry', () => {
  it('includes all 2D and 3D presets in the master list', () => {
    expect(VISUALIZER_2D_PRESETS).toEqual(['bars', 'wave', 'radial', 'contour']);
    expect(VISUALIZER_3D_PRESETS).toEqual(['orb', 'terrain', 'galaxy', 'tunnel', 'pillars']);
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
    expect(isVisualizerKind('unknown-kind')).toBe(false);
  });

  it('correctly distinguishes 3D presets from 2D presets', () => {
    expect(isVisualizer3dPreset('orb')).toBe(true);
    expect(isVisualizer3dPreset('terrain')).toBe(true);
    expect(isVisualizer3dPreset('galaxy')).toBe(true);
    expect(isVisualizer3dPreset('tunnel')).toBe(true);
    expect(isVisualizer3dPreset('pillars')).toBe(true);

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

