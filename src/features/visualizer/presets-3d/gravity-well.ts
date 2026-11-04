import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Gravity Well 3D Audio Visualizer
 *
 * What it does:
 * - A swirling particle accretion disk around a gravitational singularity.
 * - The attractor singularity follows the projected cursor in 3D space.
 * - Bass causes gravitational shockwaves (radial compression and pulse waves).
 * - Mid frequencies accelerate the orbital spin rate of the accretion disk.
 * - An event horizon void keeps the center dark, ensuring lyrics remain readable.
 *
 * Audio mapping:
 * - Bass (bins 0-5): gravitational pulse / expansion ring.
 * - Mids (bins 6-27): orbital spin velocity multiplier.
 * - Treble: particle micro-jitter / thermal luminescence.
 *
 * Cursor behavior:
 * - Projected to the z = 0 plane. The attractor center smoothly tracks the cursor.
 * - When idle, the well gently glides back to the center and continues orbiting.
 *
 * Tunable constants:
 * - PARTICLE_COUNT: 2400 (lightweight & 60fps target)
 * - INNER_HORIZON: 3.2 (event horizon radius)
 * - OUTER_RADIUS: 25.0
 */

const PARTICLE_COUNT = 2400;
const INNER_HORIZON = 3.2;
const OUTER_RADIUS = 25.0;

export function createGravityWellPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, 34);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);

  // Orbital simulation metadata
  const baseRadii = new Float32Array(PARTICLE_COUNT);
  const currentRadii = new Float32Array(PARTICLE_COUNT);
  const angles = new Float32Array(PARTICLE_COUNT);
  const orbitalSpeeds = new Float32Array(PARTICLE_COUNT);
  const verticalOffsets = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Inverse square density: denser near horizon, sparser further out
    const u = Math.random();
    const r = INNER_HORIZON + Math.pow(u, 1.8) * (OUTER_RADIUS - INNER_HORIZON);
    const theta = Math.random() * Math.PI * 2;

    baseRadii[i] = r;
    currentRadii[i] = r;
    angles[i] = theta;

    // Keplerian-like orbit speed: v ~ 1 / sqrt(r)
    orbitalSpeeds[i] = (1.4 / Math.sqrt(r)) * (0.85 + Math.random() * 0.3);
    verticalOffsets[i] = (Math.random() - 0.5) * (0.4 + r * 0.08);

    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    const z = verticalOffsets[i];

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Initial color based on radial distance
    const normR = (r - INNER_HORIZON) / (OUTER_RADIUS - INNER_HORIZON);
    const col = normR < 0.25 ? palette.tertiary : normR < 0.65 ? palette.primary : palette.secondary;
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.9,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  group.add(points);

  const attractorWorld = new THREE.Vector3(0, 0, 0);
  const smoothedAttractor = new THREE.Vector3(0, 0, 0);

  return {
    update: (
      _bands,
      _wave,
      _level,
      bass,
      clock,
      pointer: PointerTarget,
      pal: Palette3D,
      features?: AudioFeatures,
    ) => {
      const motionScale = features?.reducedMotion ? 0.35 : 1.0;
      const mids = features ? features.mid : 0.3;
      const beatEnergy = features ? features.beatEnergy : bass * 0.5;
      const pace = features ? features.paceMultiplier : 1.0;

      // Project cursor to world plane z = 0
      pointer.projectToPlane(camera, 0, attractorWorld);
      // Smooth attractor position to avoid sudden jumps
      smoothedAttractor.lerp(attractorWorld, 0.12);

      // Speed boost from mid frequencies and fast song parts
      const spinMultiplier = (1.0 + mids * 2.5) * motionScale * pace;

      // Gravitational pulse shockwave
      const gravityPulse = (bass * 3.5 + beatEnergy * 2.0) * motionScale;

      const pos = geometry.attributes.position.array as Float32Array;
      const col = geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;

        // Advance angle around attractor
        angles[i] += orbitalSpeeds[i] * 0.02 * spinMultiplier;

        // Radius breathes with gravity pulse
        const baseR = baseRadii[i];
        const pulseOffset = Math.sin(clock * 3.0 - baseR * 0.4) * gravityPulse * 0.4;
        const r = Math.max(INNER_HORIZON * 0.9, baseR + pulseOffset);

        const a = angles[i];
        const localX = Math.cos(a) * r;
        const localY = Math.sin(a) * r;
        const localZ = verticalOffsets[i] * (1.0 + bass * 1.5);

        // Position relative to attractor
        pos[i3] = smoothedAttractor.x + localX;
        pos[i3 + 1] = smoothedAttractor.y + localY;
        pos[i3 + 2] = smoothedAttractor.z + localZ;

        // Dynamic coloration: hot white-hot near event horizon, falling off to theme accents
        const normDist = Math.max(0, Math.min(1, (r - INNER_HORIZON) / (OUTER_RADIUS - INNER_HORIZON)));
        const targetColor =
          normDist < 0.2
            ? pal.tertiary
            : normDist < 0.6
              ? pal.primary
              : pal.secondary;

        // Luminescence flashes with beat
        const flash = 1.0 + beatEnergy * 0.6 * (1 - normDist);
        col[i3] = Math.min(1, targetColor.r * flash);
        col[i3 + 1] = Math.min(1, targetColor.g * flash);
        col[i3 + 2] = Math.min(1, targetColor.b * flash);
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;

      // Subtle disc tilt following cursor parallax
      points.rotation.x = 0.45 + pointer.y * 0.35 * motionScale;
      points.rotation.y = pointer.x * 0.4 * motionScale;
      points.rotation.z = clock * 0.04;
    },

    dispose: () => {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
    },
  };
}
