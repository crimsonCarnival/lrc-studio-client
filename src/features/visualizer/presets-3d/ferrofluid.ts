import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Ferrofluid 3D Audio Visualizer
 *
 * What it does:
 * - Simulates a dark, glossy droplet of magnetic fluid with organic spikes.
 * - Spikes lean and stretch toward the cursor/touch point.
 * - Bass controls spike height and droplet core expansion.
 * - Treble controls spike sharpness (narrower, sharper cones).
 * - Idle state creates a gentle magnetic breathing pulsation.
 *
 * Audio mapping:
 * - Bass (bins 0-5): spike elongation and core volume dilation.
 * - Treble (bins 28-63): magnetic field focus / spike needle sharpness.
 * - Waveform: fluid surface tension micro-ripples.
 *
 * Cursor behavior:
 * - Raycasted to the droplet sphere; magnetic spikes orient towards the cursor vector.
 * - When idle, cursor target eases into a smooth figure-eight orbit.
 *
 * Tunable constants:
 * - BASE_RADIUS: 5.0
 * - SUBDIVISIONS: 4 (uniform icosahedron)
 * - SPIKE_MAX_HEIGHT: 2.2
 */

const BASE_RADIUS = 5.0;
const SUBDIVISIONS = 4;

export function createFerrofluidPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, 22);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Uniform sphere geometry from icosahedron
  const geometry = new THREE.IcosahedronGeometry(BASE_RADIUS, SUBDIVISIONS);
  const posAttr = geometry.attributes.position;
  const vertexCount = posAttr.count;
  const basePositions = new Float32Array(posAttr.array);
  const baseNormals = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    const i3 = i * 3;
    const x = basePositions[i3];
    const y = basePositions[i3 + 1];
    const z = basePositions[i3 + 2];
    const len = Math.hypot(x, y, z) || 1;
    baseNormals[i3] = x / len;
    baseNormals[i3 + 1] = y / len;
    baseNormals[i3 + 2] = z / len;
  }

  // Dark glossy metallic material with subtle rim reflection
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x0a0c14,
    emissive: 0x05070e,
    roughness: 0.16,
    metalness: 0.88,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    reflectivity: 0.8,
  });

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // Dynamic lights for glossy specular spikes
  const ambientLight = new THREE.AmbientLight(0x181a24, 1.2);
  group.add(ambientLight);

  const cursorLight = new THREE.PointLight(palette.secondary, 2.5, 30);
  cursorLight.position.set(0, 0, 10);
  group.add(cursorLight);

  const rimLight = new THREE.DirectionalLight(palette.tertiary, 1.4);
  rimLight.position.set(-12, 10, -8);
  group.add(rimLight);

  const fillLight = new THREE.DirectionalLight(palette.primary, 1.1);
  fillLight.position.set(12, -8, -5);
  group.add(fillLight);

  const centerVec = new THREE.Vector3(0, 0, 0);
  const cursorWorld = new THREE.Vector3();
  const dirToCursor = new THREE.Vector3();

  return {
    update: (
      _bands,
      wave,
      _level,
      bass,
      clock,
      pointer: PointerTarget,
      pal: Palette3D,
      features?: AudioFeatures,
    ) => {
      // Dynamic palette sync
      cursorLight.color.copy(pal.secondary);
      rimLight.color.copy(pal.tertiary);
      fillLight.color.copy(pal.primary);

      const motionScale = features?.reducedMotion ? 0.35 : 1.0;
      const treble = features ? features.treble : 0.2;
      const beatEnergy = features ? features.beatEnergy : bass * 0.5;

      // Project cursor onto sphere to find magnetic attraction vector
      pointer.projectToSphere(camera, centerVec, BASE_RADIUS, cursorWorld);
      dirToCursor.copy(cursorWorld).sub(centerVec).normalize();

      // Position cursor light near pointer
      cursorLight.position.set(cursorWorld.x * 1.4, cursorWorld.y * 1.4, cursorWorld.z + 4);

      // Spike calculation parameters
      const spikePower = 2.0 + treble * 5.5; // High treble = sharp needles
      const maxSpike = (0.25 + bass * 1.5 + beatEnergy * 0.4) * motionScale;
      const rippleAmp = 0.05 * motionScale;

      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const nx = baseNormals[i3];
        const ny = baseNormals[i3 + 1];
        const nz = baseNormals[i3 + 2];

        // Magnetic alignment: dot product with cursor vector
        const dot = nx * dirToCursor.x + ny * dirToCursor.y + nz * dirToCursor.z;
        const align = Math.max(0, dot);

        // Multi-frequency magnetic spike pattern
        const spikeBase = Math.pow(align, spikePower);
        const waveIdx = i % wave.length;
        const waveDisplacement = wave[waveIdx] * rippleAmp;

        // Surface magnetic ripple modulation
        const ripple =
          Math.sin(nx * 8.0 + clock * 2.0) *
          Math.sin(ny * 8.0 + clock * 1.7) *
          Math.sin(nz * 8.0 + clock * 1.5) *
          0.06;

        // Radial stretch
        const stretch = 1.0 + spikeBase * maxSpike + ripple + waveDisplacement;

        // Lean vertex slightly toward cursor direction for magnetic pull effect
        const lean = spikeBase * 0.25 * motionScale;
        const vx = (nx * (1 - lean) + dirToCursor.x * lean) * BASE_RADIUS * stretch;
        const vy = (ny * (1 - lean) + dirToCursor.y * lean) * BASE_RADIUS * stretch;
        const vz = (nz * (1 - lean) + dirToCursor.z * lean) * BASE_RADIUS * stretch;

        positions[i3] = vx;
        positions[i3 + 1] = vy;
        positions[i3 + 2] = vz;
      }

      posAttr.needsUpdate = true;
      geometry.computeVertexNormals();

      // Subtle droplet wobble and tilt
      group.rotation.x = pointer.y * 0.25 + Math.sin(clock * 0.4) * 0.05;
      group.rotation.y = pointer.x * 0.35 + clock * 0.1;
    },

    dispose: () => {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
    },
  };
}
