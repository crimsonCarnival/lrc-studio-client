import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Cymatics 3D Audio Visualizer
 *
 * What it does:
 * - Sand on a vibrating plate (a Chladni plate), tilted below the lyrics.
 * - Every grain slides toward the nodal lines of the current vibration mode, where the plate
 *   stands still, so the sand draws the mode's geometric figure.
 *
 * The mode is a Chladni pattern f(x, y) = cos(nπx)cos(mπy) − cos(mπx)cos(nπy). Grains descend
 * f², i.e. they move against f·∇f, which converges on the f = 0 lines.
 *
 * Audio mapping:
 * - Spectral centroid: picks the mode (darker music → simpler figures, brighter → denser ones).
 *   The mode only changes on a beat, and at most every MODE_HOLD seconds, so figures can form.
 * - RMS energy: how hard the plate shakes grains off the lines.
 * - Beats: a short kick that scatters the sand; it re-settles within a second or two.
 * - Grains off a nodal line hop above the plate, so loud passages look like boiling sand.
 *
 * Tunable constants:
 * - PARTICLES: 5000 (2500 in previews)
 * - MODES: (n, m) pairs, ordered simple → complex
 * - MODE_HOLD: 2.5 s minimum between figure changes
 */

const PARTICLES = 5000;
const PLATE_HALF = 15;
const STEP = 0.012;
const MODE_HOLD = 2.5;
const MODES: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [1, 3], [2, 3], [1, 4], [2, 5], [3, 4], [3, 5], [4, 5], [2, 7], [5, 6], [4, 7],
];

export function createCymaticsPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, 30);
  camera.lookAt(0, 0, 0);

  const count = options.preview ? PARTICLES / 2 : PARTICLES;

  const group = new THREE.Group();
  group.position.set(0, -9, -2);
  group.rotation.x = -1.05;
  scene.add(group);

  // Plate coordinates live in [-1, 1]; positions are scaled to world units on write.
  const px = new Float32Array(count);
  const py = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    px[i] = Math.random() * 2 - 1;
    py[i] = Math.random() * 2 - 1;
  }

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: palette.primary,
    size: 0.17,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  group.add(points);

  const plateGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-PLATE_HALF, -PLATE_HALF, 0),
    new THREE.Vector3(PLATE_HALF, -PLATE_HALF, 0),
    new THREE.Vector3(PLATE_HALF, PLATE_HALF, 0),
    new THREE.Vector3(-PLATE_HALF, PLATE_HALF, 0),
  ]);
  const plateMat = new THREE.LineBasicMaterial({ color: palette.secondary, transparent: true, opacity: 0.3 });
  group.add(new THREE.LineLoop(plateGeo, plateMat));

  let mode = 1;
  let lastSwitch = -Infinity;
  let kick = 0;

  return {
    update: (
      _bands,
      _wave,
      level,
      _bass,
      clock,
      _pointer: PointerTarget,
      pal: Palette3D,
      features?: AudioFeatures,
    ) => {
      material.color.copy(pal.primary);
      plateMat.color.copy(pal.secondary);
      material.size = pal.light ? 0.34 : 0.17;
      material.opacity = pal.light ? 1 : 0.9;
      plateMat.opacity = pal.light ? 0.55 : 0.3;

      const motion = features?.reducedMotion ? 0.35 : 1.0;
      const energy = features?.rms ?? level;
      const centroid = features?.spectralCentroid ?? 0.4;

      const target = Math.min(MODES.length - 1, Math.max(0, Math.floor(centroid * MODES.length)));
      if (features?.beat) {
        kick = Math.max(kick, 0.035);
        if (target !== mode && clock - lastSwitch > MODE_HOLD) {
          mode = target;
          lastSwitch = clock;
          kick = 0.09;
        }
      }
      kick *= 0.9;

      const [n, m] = MODES[mode];
      const nPi = n * Math.PI;
      const mPi = m * Math.PI;
      const jitter = (0.0015 + energy * 0.012 + kick) * motion;
      const hop = (0.25 + energy * 1.4) * motion;

      for (let i = 0; i < count; i++) {
        const x = px[i];
        const y = py[i];
        const cnx = Math.cos(nPi * x), snx = Math.sin(nPi * x);
        const cmx = Math.cos(mPi * x), smx = Math.sin(mPi * x);
        const cny = Math.cos(nPi * y), sny = Math.sin(nPi * y);
        const cmy = Math.cos(mPi * y), smy = Math.sin(mPi * y);

        const f = cnx * cmy - cmx * cny;
        const gx = -nPi * snx * cmy + mPi * smx * cny;
        const gy = -mPi * cnx * smy + nPi * cmx * sny;
        const len = Math.sqrt(gx * gx + gy * gy) + 1e-4;

        let nx = x - STEP * f * (gx / len) + (Math.random() - 0.5) * 2 * jitter;
        let ny = y - STEP * f * (gy / len) + (Math.random() - 0.5) * 2 * jitter;
        // Grains that leave the plate fall back in just inside the rim.
        if (nx > 1) nx = 1 - Math.random() * 0.05;
        else if (nx < -1) nx = -1 + Math.random() * 0.05;
        if (ny > 1) ny = 1 - Math.random() * 0.05;
        else if (ny < -1) ny = -1 + Math.random() * 0.05;
        px[i] = nx;
        py[i] = ny;

        const i3 = i * 3;
        positions[i3] = nx * PLATE_HALF;
        positions[i3 + 1] = ny * PLATE_HALF;
        positions[i3 + 2] = Math.abs(f) * hop;
      }
      geometry.attributes.position.needsUpdate = true;

      group.rotation.z = Math.sin(clock * 0.08) * 0.25 * motion;
    },

    dispose: () => {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
      plateGeo.dispose();
      plateMat.dispose();
    },
  };
}
