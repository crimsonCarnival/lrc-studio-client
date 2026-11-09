import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Silk 3D Audio Visualizer
 *
 * What it does:
 * - A 3D suspended cloth mesh with FFT-driven traveling waves.
 * - The cursor pushes into and pinches the fabric with tactile spring-back physics.
 * - Audio frequencies send undulating waves across the fabric surface.
 * - Sheer, luminous material keeps center readability high for lyrics.
 *
 * Audio mapping:
 * - Low bands (left): deep, billowing cloth swells.
 * - High bands (right): delicate, shimmering fabric crinkles.
 * - Bass & Beat: whole-cloth breathe and impulse rebound.
 *
 * Cursor behavior:
 * - Projected to the cloth plane. Proximity creates a localized elastic indentation
 *   that rebounds and generates propagating ripple wakes upon release.
 *
 * Tunable constants:
 * - WIDTH: 38, HEIGHT: 26
 * - SEG_X: 48, SEG_Y: 36
 * - SPRING_K: 0.14, DAMPING: 0.91
 */

const WIDTH = 38;
const HEIGHT = 26;
const SEG_X = 48;
const SEG_Y = 36;
const SPRING_K = 0.14;
const DAMPING = 0.91;

export function createSilkPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, 26);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, SEG_X, SEG_Y);
  const posAttr = geometry.attributes.position;
  const vertexCount = posAttr.count;

  const basePositions = new Float32Array(posAttr.array);
  const zVelocities = new Float32Array(vertexCount);
  const zDisplacements = new Float32Array(vertexCount);

  // Sheer fabric material with two-sided rendering
  const material = new THREE.MeshStandardMaterial({
    color: 0x121626,
    roughness: 0.42,
    metalness: 0.55,
    wireframe: true,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // Soft directional lighting for silk sheen
  const light1 = new THREE.DirectionalLight(palette.primary, 1.8);
  light1.position.set(10, 15, 12);
  group.add(light1);

  const light2 = new THREE.DirectionalLight(palette.secondary, 1.4);
  light2.position.set(-10, -12, 10);
  group.add(light2);

  const cursorWorld = new THREE.Vector3();

  return {
    update: (
      bands,
      _wave,
      _level,
      bass,
      clock,
      pointer: PointerTarget,
      pal: Palette3D,
      features?: AudioFeatures,
    ) => {
      light1.color.copy(pal.primary);
      light2.color.copy(pal.secondary);
      // A dark tinted cloth under bright lights on dark themes; on a light page the cloth is the
      // theme's own colour, held strong enough to read against the page.
      material.color.copy(pal.primary).multiplyScalar(pal.light ? 1.0 : 0.55);
      material.opacity = pal.light ? 0.5 : 0.8;
      // Metal without an environment map renders near black; on light themes keep it matte so the colour shows.
      material.metalness = pal.light ? 0.05 : 0.55;

      const motionScale = features?.reducedMotion ? 0.35 : 1.0;
      const beatEnergy = features ? features.beatEnergy : bass * 0.5;
      const pace = features ? features.paceMultiplier : 1.0;

      // Project pointer into cloth plane z = 0
      pointer.projectToPlane(camera, 0, cursorWorld);

      const positions = posAttr.array as Float32Array;
      const pinchRadius = 8.5;
      const pushDepth = -6.5 * motionScale;

      for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const bx = basePositions[i3];
        const by = basePositions[i3 + 1];

        // 1. Audio harmonic target displacement accelerated by song pace
        const col = i % (SEG_X + 1);
        const bandIdx = Math.min(63, Math.floor((col / SEG_X) * 63));
        const bandAmp = bands[bandIdx] || 0;

        const travelWave =
          Math.sin(bx * 0.32 + clock * 2.2 * pace) * Math.cos(by * 0.28 + clock * 1.6 * pace) * 1.4 +
          Math.sin(bx * 0.6 + by * 0.4 + clock * 3.0 * pace) * 0.6;

        const audioTargetZ = (travelWave * (0.8 + bandAmp * 2.2) + beatEnergy * 1.8) * motionScale;

        // 2. Interactive cursor pinch / depression force
        const dx = bx - cursorWorld.x;
        const dy = by - cursorWorld.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let cursorForce = 0;
        if (dist < pinchRadius) {
          const falloff = 1 - dist / pinchRadius;
          cursorForce = Math.pow(falloff, 2.0) * pushDepth;
        }

        const targetZ = audioTargetZ + cursorForce;

        // 3. Spring-mass velocity integration
        const currentZ = zDisplacements[i];
        const springForce = (targetZ - currentZ) * SPRING_K;
        zVelocities[i] = (zVelocities[i] + springForce) * DAMPING;
        zDisplacements[i] += zVelocities[i];

        positions[i3 + 2] = zDisplacements[i];
      }

      posAttr.needsUpdate = true;
      geometry.computeVertexNormals();

      // Fluid fabric tilting with cursor
      group.rotation.x = pointer.y * 0.22 * motionScale;
      group.rotation.y = pointer.x * 0.28 * motionScale;
    },

    dispose: () => {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
    },
  };
}
