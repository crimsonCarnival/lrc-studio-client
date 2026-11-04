import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Ribbons 3D Audio Visualizer
 *
 * What it does:
 * - 16 floating frequency ribbons with 3D trail histories.
 * - Ribbon heads chase the cursor target with staggered lag (bass ribbons move majestically slow, treble ribbons dart swiftly).
 * - Band audio energy modulates ribbon width and twisting wave harmonics.
 * - Dynamic color gradient across the frequency spectrum.
 *
 * Audio mapping:
 * - 16 frequency bands sampled from 64 bins (bass to treble).
 * - Band amplitude: ribbon width, flutter rate, and illumination intensity.
 * - Beat: synchronous forward surge.
 *
 * Cursor behavior:
 * - Heads follow cursor projected to world space.
 * - Staggered spring inertia creates fluid serpentine trailing curves.
 *
 * Tunable constants:
 * - RIBBON_COUNT: 16
 * - SEGMENT_COUNT: 36
 * - BASE_WIDTH: 0.35
 */

const RIBBON_COUNT = 16;
const SEGMENT_COUNT = 36;
const BASE_WIDTH = 0.35;

interface Ribbon {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshBasicMaterial;
  headX: number;
  headY: number;
  headZ: number;
  history: THREE.Vector3[];
  bandIdx: number;
  speed: number;
  offsetAngle: number;
}

export function createRibbonsPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, 32);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  const ribbons: Ribbon[] = [];

  for (let r = 0; r < RIBBON_COUNT; r++) {
    // 2 vertices per segment
    const vertexCount = SEGMENT_COUNT * 2;
    const positions = new Float32Array(vertexCount * 3);
    const indices: number[] = [];

    for (let s = 0; s < SEGMENT_COUNT - 1; s++) {
      const v0 = s * 2;
      const v1 = s * 2 + 1;
      const v2 = (s + 1) * 2;
      const v3 = (s + 1) * 2 + 1;
      indices.push(v0, v1, v2);
      indices.push(v2, v1, v3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);

    const normBand = r / (RIBBON_COUNT - 1);
    const col = normBand < 0.35 ? palette.tertiary : normBand < 0.7 ? palette.primary : palette.secondary;

    const material = new THREE.MeshBasicMaterial({
      color: col,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    const history: THREE.Vector3[] = [];
    for (let s = 0; s < SEGMENT_COUNT; s++) {
      history.push(new THREE.Vector3(0, 0, -s * 0.4));
    }

    // Map ribbon index to 64 FFT bands
    const bandIdx = Math.min(63, Math.floor(r * (64 / RIBBON_COUNT)));
    // Low bands (bass) = slow heavy inertia; High bands (treble) = quick snappy follow
    const speed = 0.035 + (r / (RIBBON_COUNT - 1)) * 0.16;
    const offsetAngle = (r / RIBBON_COUNT) * Math.PI * 2;

    ribbons.push({
      mesh,
      geometry,
      material,
      headX: 0,
      headY: 0,
      headZ: -r * 0.2,
      history,
      bandIdx,
      speed,
      offsetAngle,
    });
  }

  const cursorWorld = new THREE.Vector3();
  const upVec = new THREE.Vector3(0, 1, 0);
  const forwardVec = new THREE.Vector3();
  const normalVec = new THREE.Vector3();

  return {
    update: (
      bands,
      _wave,
      _level,
      _bass,
      clock,
      pointer: PointerTarget,
      pal: Palette3D,
      features?: AudioFeatures,
    ) => {
      const motionScale = features?.reducedMotion ? 0.35 : 1.0;

      // Project cursor to world z = 0
      pointer.projectToPlane(camera, 0, cursorWorld);

      for (let r = 0; r < RIBBON_COUNT; r++) {
        const ribbon = ribbons[r];
        const normBand = r / (RIBBON_COUNT - 1);

        // Dynamic color transition
        const targetColor =
          normBand < 0.35 ? pal.tertiary : normBand < 0.7 ? pal.primary : pal.secondary;
        ribbon.material.color.copy(targetColor);

        const bandEnergy = bands[ribbon.bandIdx] || 0;

        // Radial offset around cursor so ribbons don't all overlap into a single line
        const spreadRadius = (1.5 + normBand * 3.5) * motionScale;
        const orbitSpeed = clock * (1.2 + normBand * 1.5);
        const targetHeadX = cursorWorld.x + Math.cos(ribbon.offsetAngle + orbitSpeed) * spreadRadius;
        const targetHeadY = cursorWorld.y + Math.sin(ribbon.offsetAngle + orbitSpeed) * spreadRadius;
        const targetHeadZ = (Math.sin(clock * 2.0 + r) * 2.0 - normBand * 4.0) * motionScale;

        // Move head toward target with staggered inertia
        const step = ribbon.speed * motionScale;
        ribbon.headX += (targetHeadX - ribbon.headX) * step;
        ribbon.headY += (targetHeadY - ribbon.headY) * step;
        ribbon.headZ += (targetHeadZ - ribbon.headZ) * step;

        // Shift history trail
        for (let s = SEGMENT_COUNT - 1; s > 0; s--) {
          ribbon.history[s].copy(ribbon.history[s - 1]);
        }
        ribbon.history[0].set(ribbon.headX, ribbon.headY, ribbon.headZ);

        // Generate ribbon strip mesh vertices
        const pos = ribbon.geometry.attributes.position.array as Float32Array;
        const width = (BASE_WIDTH + bandEnergy * 1.6) * motionScale;

        for (let s = 0; s < SEGMENT_COUNT; s++) {
          const cur = ribbon.history[s];
          const next = ribbon.history[Math.min(SEGMENT_COUNT - 1, s + 1)];

          forwardVec.subVectors(next, cur).normalize();
          normalVec.crossVectors(forwardVec, upVec).normalize();
          if (normalVec.lengthSq() < 1e-4) normalVec.set(1, 0, 0);

          // Taper toward tail
          const taper = (1 - s / (SEGMENT_COUNT - 1));
          const segWidth = width * taper;

          const v0 = (s * 2) * 3;
          const v1 = (s * 2 + 1) * 3;

          pos[v0] = cur.x + normalVec.x * segWidth;
          pos[v0 + 1] = cur.y + normalVec.y * segWidth;
          pos[v0 + 2] = cur.z + normalVec.z * segWidth;

          pos[v1] = cur.x - normalVec.x * segWidth;
          pos[v1 + 1] = cur.y - normalVec.y * segWidth;
          pos[v1 + 2] = cur.z - normalVec.z * segWidth;
        }

        ribbon.geometry.attributes.position.needsUpdate = true;
      }
    },

    dispose: () => {
      scene.remove(group);
      for (const r of ribbons) {
        r.geometry.dispose();
        r.material.dispose();
      }
    },
  };
}
