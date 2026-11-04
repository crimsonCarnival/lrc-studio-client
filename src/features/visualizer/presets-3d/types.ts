import * as THREE from 'three';

export interface Palette3D {
  primary: THREE.Color;
  secondary: THREE.Color;
  tertiary: THREE.Color;
}

export interface Visualizer3dOptions {
  bloom?: boolean;
  preview?: boolean;
}

export interface PointerTarget {
  /** Smoothed NDC coordinates [-1, 1] relative to center */
  x: number;
  y: number;
  /** Direct vector representation of (x, y) */
  ndc: THREE.Vector2;
  /** Whether the user has been idle (>2s) or left the screen */
  isIdle: boolean;
  /** Normalized idle transition factor from 0 (active) to 1 (idle) */
  idleAmount: number;
  /** Raycast to a plane perpendicular to Z at world depth planeZ */
  projectToPlane: (camera: THREE.Camera, planeZ?: number, target?: THREE.Vector3) => THREE.Vector3;
  /** Raycast to a spherical volume, clamping to sphere horizon if missed */
  projectToSphere: (
    camera: THREE.Camera,
    center: THREE.Vector3,
    radius: number,
    target?: THREE.Vector3,
  ) => THREE.Vector3;
}

export interface AudioFeatures {
  /** Sub-bass to bass energy [0, 1] (bins 0-5) */
  bass: number;
  /** Midrange energy [0, 1] (bins 6-27) */
  mid: number;
  /** Treble energy [0, 1] (bins 28-63) */
  treble: number;
  /** Root-mean-square amplitude [0, 1] */
  rms: number;
  /** Frequency balance from 0 (dark/sub-heavy) to 1 (bright/treble-heavy) */
  spectralCentroid: number;
  /** Beat onset boolean for this frame */
  beat: boolean;
  /** Exponentially decaying beat impulse (1.0 -> 0.0) */
  beatEnergy: number;
  /** Whether prefers-reduced-motion is active */
  reducedMotion: boolean;
}

export interface PresetInstance {
  update: (
    bands: Float32Array,
    wave: Float32Array,
    level: number,
    bass: number,
    clock: number,
    pointer: PointerTarget,
    palette: Palette3D,
    features?: AudioFeatures,
  ) => void;
  dispose: () => void;
}

export type Preset3dBuilder = (
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  options?: Visualizer3dOptions,
) => PresetInstance;
