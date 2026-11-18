// The 3D preset ids, kept apart from visualizer-3d.ts so that pages which only list, validate or
// pick a preset never pull three.js into their chunk. The runner itself is imported on demand.
export const VISUALIZER_3D_PRESETS = [
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
] as const;
export type Visualizer3dPresetId = (typeof VISUALIZER_3D_PRESETS)[number];

export function isVisualizer3dPreset(value: unknown): value is Visualizer3dPresetId {
  return (VISUALIZER_3D_PRESETS as readonly unknown[]).includes(value);
}

export interface Visualizer3dOptions {
  bloom?: boolean;
  preview?: boolean;
}
