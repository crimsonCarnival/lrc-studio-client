import * as THREE from 'three';
import type { Palette3D, PaletteColorKey, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Aurora 3D Audio Visualizer
 *
 * What it does:
 * - Translucent light curtains hanging from the top edge of the stage, layered in depth.
 * - The curtains frame the lyrics from above instead of sitting behind them.
 *
 * Audio mapping:
 * - Bands: each column of a curtain hangs lower as its band gets louder.
 * - Bass: the whole curtain drops a little and brightens.
 * - Treble: speeds up the shimmer streaks running along the curtain.
 * - Pace multiplier: (via the runner clock) speeds up the folding sway.
 *
 * Tunable constants:
 * - COLUMNS: 96 vertical slices per curtain
 * - CURTAINS: top edge, depth, phase and colour pairing for each layer
 */

const COLUMNS = 96;
const WIDTH = 120;

interface CurtainSpec {
  top: number;
  z: number;
  phase: number;
  bandOffset: number;
  /** Palette keys for the lower (bright) and upper (fading) edge. */
  low: PaletteColorKey;
  high: PaletteColorKey;
  opacity: number;
}

const CURTAINS: CurtainSpec[] = [
  { top: 19, z: -16, phase: 0.0, bandOffset: 4, low: 'secondary', high: 'primary', opacity: 0.55 },
  { top: 18, z: -10, phase: 1.7, bandOffset: 12, low: 'primary', high: 'tertiary', opacity: 0.6 },
  { top: 17.5, z: -5, phase: 3.1, bandOffset: 20, low: 'secondary', high: 'tertiary', opacity: 0.5 },
  { top: 17, z: -1, phase: 4.6, bandOffset: 0, low: 'tertiary', high: 'primary', opacity: 0.35 },
];

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// uv.y = 0 on the hanging (bright) edge, 1 on the top edge where the curtain fades out.
const FRAGMENT = /* glsl */ `
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uShimmer;
  varying vec2 vUv;
  void main() {
    float h = vUv.y;
    float edge = exp(-h * 4.0);
    float body = pow(1.0 - h, 1.6);
    float ends = sin(3.14159265 * vUv.x);
    float streaks = 0.7 + 0.3 * sin(vUv.x * 220.0 + uTime * uShimmer);
    float a = (edge * 0.65 + body * 0.35) * ends * streaks * uOpacity;
    gl_FragColor = vec4(mix(uLow, uHigh, smoothstep(0.0, 0.8, h)), a);
  }
`;

interface Curtain {
  spec: CurtainSpec;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
}

export function createAuroraPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, 30);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  const curtains: Curtain[] = CURTAINS.map((spec) => {
    // One row of quads: the top row of vertices stays pinned, the bottom row hangs by band.
    const geometry = new THREE.PlaneGeometry(WIDTH, 1, COLUMNS, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uLow: { value: palette[spec.low].clone() },
        uHigh: { value: palette[spec.high].clone() },
        uOpacity: { value: spec.opacity },
        uTime: { value: 0 },
        uShimmer: { value: 0.6 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(geometry, material));
    return { spec, geometry, material };
  });

  return {
    update: (
      bands,
      _wave,
      _level,
      bass,
      clock,
      _pointer: PointerTarget,
      pal: Palette3D,
      features?: AudioFeatures,
    ) => {
      const motion = features?.reducedMotion ? 0.35 : 1.0;
      const treble = features?.treble ?? 0.2;
      const beatEnergy = features?.beatEnergy ?? 0;

      for (const { spec, geometry, material } of curtains) {
        const u = material.uniforms;
        (u.uLow.value as THREE.Color).copy(pal[spec.low]);
        (u.uHigh.value as THREE.Color).copy(pal[spec.high]);
        u.uTime.value = clock;
        u.uShimmer.value = 0.6 + treble * 4.0 * motion;
        // Light on a light page is faint, so the curtains are drawn denser there.
        u.uOpacity.value = spec.opacity * (0.75 + bass * 0.35 + beatEnergy * 0.15) * (pal.light ? 1.6 : 1);

        const pos = geometry.attributes.position.array as Float32Array;
        const row = COLUMNS + 1;
        for (let c = 0; c <= COLUMNS; c++) {
          const x = -WIDTH / 2 + (c / COLUMNS) * WIDTH;
          // Neighbouring columns share a band, averaged with the next one so the hem stays smooth.
          const b = spec.bandOffset + Math.floor((c / COLUMNS) * 36);
          const band = (bands[b % bands.length] + bands[(b + 1) % bands.length]) * 0.5;
          const sway = Math.sin(x * 0.07 + clock * 0.35 * motion + spec.phase) * 3.2
            + Math.sin(x * 0.19 - clock * 0.22 * motion + spec.phase * 2.0) * 1.2;
          const hang = 3.0 + band * 7.5 * motion + bass * 1.6 * motion;

          const top = c * 3;
          const bottom = (row + c) * 3;
          pos[top] = x;
          pos[top + 1] = spec.top + 4;
          pos[top + 2] = spec.z + sway * 0.6;
          pos[bottom] = x;
          pos[bottom + 1] = spec.top - hang;
          pos[bottom + 2] = spec.z + sway;
        }
        geometry.attributes.position.needsUpdate = true;
      }

      group.position.x = Math.sin(clock * 0.05) * 2.0 * motion;
    },

    dispose: () => {
      scene.remove(group);
      for (const c of curtains) {
        c.geometry.dispose();
        c.material.dispose();
      }
    },
  };
}
