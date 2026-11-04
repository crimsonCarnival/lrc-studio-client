import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Pond 3D Audio Visualizer
 *
 * What it does:
 * - A tranquil 3D height-field water surface running an authentic 2D discrete wave simulation.
 * - Cursor following is disabled so the natural water physics and concentric ripple dynamics
 *   can be fully appreciated.
 * - Audio beats drop concentric ripple rings; mids and trebles trigger delicate raindrop ripples.
 * - Detects fast-paced song parts to accelerate wave propagation and drop frequency.
 * - Angled perspective keeps the water plane below the lyrics center for clear readability.
 *
 * Audio mapping:
 * - Beat onsets: concentric droplet ripples dropping into the pond.
 * - Mids & Treble: acoustic raindrops across the water surface.
 * - Bass (bins 0-5): surface wave swell amplitude.
 * - Pace multiplier: accelerates wave simulation frequency and propagation velocity.
 *
 * Tunable constants:
 * - GRID_SIZE: 54 (55x55 vertices)
 * - POND_WIDTH: 44, POND_DEPTH: 44
 * - DAMPING: 0.982 (wave persistence)
 */

const GRID_SIZE = 54;
const POND_WIDTH = 44;
const POND_DEPTH = 44;
const DAMPING = 0.982;

export function createPondPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 14, 24);
  camera.lookAt(0, -2, -2);

  const group = new THREE.Group();
  scene.add(group);

  const planeGeo = new THREE.PlaneGeometry(POND_WIDTH, POND_DEPTH, GRID_SIZE, GRID_SIZE);
  planeGeo.rotateX(-Math.PI / 2.3);
  planeGeo.translate(0, -3.5, -4);

  const posAttr = planeGeo.attributes.position;
  const vertexCount = posAttr.count;
  const basePositions = new Float32Array(posAttr.array);

  // Dual heightfield simulation buffers
  const simCols = GRID_SIZE + 1;
  const simRows = GRID_SIZE + 1;
  const totalCells = simCols * simRows;

  let bufPrev = new Float32Array(totalCells);
  let bufCurr = new Float32Array(totalCells);

  const material = new THREE.MeshStandardMaterial({
    color: 0x091424,
    roughness: 0.18,
    metalness: 0.75,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });

  const mesh = new THREE.Mesh(planeGeo, material);
  group.add(mesh);

  const light1 = new THREE.DirectionalLight(palette.secondary, 2.2);
  light1.position.set(12, 18, 14);
  group.add(light1);

  const light2 = new THREE.DirectionalLight(palette.primary, 1.4);
  light2.position.set(-12, 10, -10);
  group.add(light2);

  // Helper to inject a droplet into simulation buffer
  const dropRipple = (gx: number, gy: number, strength: number) => {
    if (gx < 2 || gx >= simCols - 2 || gy < 2 || gy >= simRows - 2) return;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const falloff = dx === 0 && dy === 0 ? 1.0 : 0.6;
        const idx = (gy + dy) * simCols + (gx + dx);
        bufCurr[idx] += strength * falloff;
      }
    }
  };

  let rainTimer = 0;

  return {
    update: (
      _bands,
      _wave,
      _level,
      bass,
      clock,
      _pointer: PointerTarget,
      pal: Palette3D,
      features?: AudioFeatures,
    ) => {
      light1.color.copy(pal.secondary);
      light2.color.copy(pal.primary);

      const motionScale = features?.reducedMotion ? 0.35 : 1.0;
      const beat = features?.beat ?? false;
      const beatEnergy = features?.beatEnergy ?? 0;
      const pace = features?.paceMultiplier ?? 1.0;
      const treble = features?.treble ?? 0.2;

      // Concentric ripple on audio beat
      if (beat || beatEnergy > 0.8) {
        const centerGX = Math.floor(simCols * 0.5);
        const centerGY = Math.floor(simRows * 0.5);
        dropRipple(centerGX, centerGY, (3.2 + bass * 2.5) * motionScale);
      }

      // Raindrop ripples triggered by treble & fast tempo
      rainTimer += 0.016 * pace;
      const rainInterval = Math.max(0.12, 0.45 / pace);
      if (rainTimer > rainInterval && (treble > 0.35 || pace > 1.4)) {
        rainTimer = 0;
        const rx = 4 + Math.floor(Math.random() * (simCols - 8));
        const ry = 4 + Math.floor(Math.random() * (simRows - 8));
        dropRipple(rx, ry, (1.2 + treble * 1.5) * motionScale);
      }

      // Discrete wave propagation simulation step (multiple sub-steps for fast pace)
      const steps = pace > 1.8 ? 2 : 1;
      for (let s = 0; s < steps; s++) {
        for (let y = 1; y < simRows - 1; y++) {
          const rowOffset = y * simCols;
          for (let x = 1; x < simCols - 1; x++) {
            const idx = rowOffset + x;
            const neighbors =
              bufCurr[idx - 1] +
              bufCurr[idx + 1] +
              bufCurr[idx - simCols] +
              bufCurr[idx + simCols];

            let val = neighbors * 0.5 - bufPrev[idx];
            val *= DAMPING;
            bufPrev[idx] = val;
          }
        }

        // Swap buffers
        const temp = bufPrev;
        bufPrev = bufCurr;
        bufCurr = temp;
      }

      // Apply heights to vertex positions
      const positions = posAttr.array as Float32Array;
      const swellScale = (0.35 + bass * 0.8) * motionScale;

      for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const x = basePositions[i3];
        const z = basePositions[i3 + 2];

        // Ambient deep water tidal swell accelerated by song pace
        const ambientSwell =
          Math.sin(x * 0.25 + clock * 2.0 * pace) *
          Math.cos(z * 0.25 + clock * 1.6 * pace) *
          swellScale;

        const rippleHeight = bufCurr[i] * motionScale;

        positions[i3 + 1] = basePositions[i3 + 1] + ambientSwell + rippleHeight;
      }

      posAttr.needsUpdate = true;
      planeGeo.computeVertexNormals();

      // Gentle autonomous breathing camera motion
      camera.position.x = Math.sin(clock * 0.2 * pace) * 1.2;
      camera.position.y = 14 + Math.cos(clock * 0.15 * pace) * 0.8;
      camera.lookAt(0, -2, -2);
    },

    dispose: () => {
      scene.remove(group);
      planeGeo.dispose();
      material.dispose();
    },
  };
}
