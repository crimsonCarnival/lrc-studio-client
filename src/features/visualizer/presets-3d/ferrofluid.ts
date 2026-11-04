import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Ferrofluid 3D Audio Visualizer
 *
 * What it does:
 * - Simulates a sculpted droplet of magnetic liquid ferrofluid with organic spikes.
 * - Magnetic spikes stretch and lean toward the cursor vector.
 * - Spikes gleam with iridescent tip luminescence, clearly visible in dark themes.
 * - Bass controls spike height and droplet core expansion; treble sharpens spikes.
 * - Accelerates fluid ripples and rotation during fast-paced song sections.
 *
 * Audio mapping:
 * - Bass (bins 0-5): spike elongation and core volume dilation.
 * - Treble (bins 28-63): magnetic field focus / spike needle sharpness.
 * - Waveform: fluid surface tension micro-ripples.
 * - Pace multiplier: increases fluid circulation and rotation speed.
 *
 * Cursor behavior:
 * - Raycasted to droplet sphere; spikes orient towards cursor vector.
 * - When idle, cursor target eases into a smooth figure-eight orbit.
 *
 * Tunable constants:
 * - BASE_RADIUS: 5.2
 * - SUBDIVISIONS: 4 (uniform icosahedron)
 */

const BASE_RADIUS = 5.2;
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

  // Per-vertex color buffer for iridescent spike glow in dark themes
  const colors = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    colors[i * 3] = 0.12;
    colors[i * 3 + 1] = 0.15;
    colors[i * 3 + 2] = 0.24;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

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

  // Deep lustrous metallic material with clearcoat and vertex colors
  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    color: 0x222a3e,
    emissive: 0x081020,
    roughness: 0.18,
    metalness: 0.82,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.9,
  });

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // Subtle inner glowing magnetic core to give the fluid luminous depth
  const coreGeo = new THREE.IcosahedronGeometry(BASE_RADIUS * 0.72, 2);
  const coreMat = new THREE.MeshBasicMaterial({
    color: palette.tertiary,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // Enhanced dynamic lighting to sculpt specular spikes against dark backgrounds
  const ambientLight = new THREE.AmbientLight(0x283248, 1.8);
  group.add(ambientLight);

  const cursorLight = new THREE.PointLight(palette.secondary, 5.0, 36);
  cursorLight.position.set(0, 0, 10);
  group.add(cursorLight);

  const rimLight = new THREE.DirectionalLight(palette.tertiary, 3.8);
  rimLight.position.set(-14, 12, -8);
  group.add(rimLight);

  const fillLight = new THREE.DirectionalLight(palette.primary, 3.2);
  fillLight.position.set(14, -10, -6);
  group.add(fillLight);

  const centerVec = new THREE.Vector3(0, 0, 0);
  const cursorWorld = new THREE.Vector3();
  const dirToCursor = new THREE.Vector3();
  const tempCol = new THREE.Color();

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
      coreMat.color.copy(pal.tertiary);

      const motionScale = features?.reducedMotion ? 0.35 : 1.0;
      const treble = features ? features.treble : 0.2;
      const beatEnergy = features ? features.beatEnergy : bass * 0.5;
      const pace = features ? features.paceMultiplier : 1.0;

      // Pulse inner magnetic core with bass & fast tempo
      const coreScale = 1.0 + (bass * 0.4 + beatEnergy * 0.3) * motionScale;
      coreMesh.scale.set(coreScale, coreScale, coreScale);
      coreMesh.rotation.y += 0.015 * pace;

      // Project cursor onto sphere to find magnetic attraction vector
      pointer.projectToSphere(camera, centerVec, BASE_RADIUS, cursorWorld);
      dirToCursor.copy(cursorWorld).sub(centerVec).normalize();

      // Position cursor light near pointer
      cursorLight.position.set(cursorWorld.x * 1.35, cursorWorld.y * 1.35, cursorWorld.z + 4.5);

      // Spike calculation parameters
      const spikePower = 1.8 + treble * 5.0; // Treble sharpens magnetic spikes
      const maxSpike = (0.35 + bass * 1.8 + beatEnergy * 0.5) * motionScale;
      const rippleAmp = 0.08 * motionScale;

      const positions = posAttr.array as Float32Array;
      const colAttr = geometry.attributes.color.array as Float32Array;

      // Animated time scaled by fast-paced song detection
      const animatedTime = clock * pace;

      for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const nx = baseNormals[i3];
        const ny = baseNormals[i3 + 1];
        const nz = baseNormals[i3 + 2];

        // Magnetic alignment: dot product with cursor vector
        const dot = nx * dirToCursor.x + ny * dirToCursor.y + nz * dirToCursor.z;
        const align = Math.max(0, dot);

        // Spike intensity
        const spikeBase = Math.pow(align, spikePower);
        const waveIdx = i % wave.length;
        const waveDisplacement = wave[waveIdx] * rippleAmp;

        // Surface magnetic ripple modulation accelerated on fast parts
        const ripple =
          Math.sin(nx * 7.5 + animatedTime * 2.5) *
          Math.sin(ny * 7.5 + animatedTime * 2.0) *
          Math.sin(nz * 7.5 + animatedTime * 1.8) *
          0.08;

        // Radial stretch
        const stretch = 1.0 + spikeBase * maxSpike + ripple + waveDisplacement;

        // Lean vertex toward cursor direction
        const lean = spikeBase * 0.28 * motionScale;
        const vx = (nx * (1 - lean) + dirToCursor.x * lean) * BASE_RADIUS * stretch;
        const vy = (ny * (1 - lean) + dirToCursor.y * lean) * BASE_RADIUS * stretch;
        const vz = (nz * (1 - lean) + dirToCursor.z * lean) * BASE_RADIUS * stretch;

        positions[i3] = vx;
        positions[i3 + 1] = vy;
        positions[i3 + 2] = vz;

        // Iridescent spike tip coloring: metallic body -> secondary/tertiary glow on spikes
        const bodyBaseR = 0.14 + pal.primary.r * 0.15;
        const bodyBaseG = 0.16 + pal.primary.g * 0.15;
        const bodyBaseB = 0.26 + pal.primary.b * 0.18;

        const spikeGlow = Math.min(1.0, spikeBase * (1.2 + beatEnergy));
        tempCol.setRGB(bodyBaseR, bodyBaseG, bodyBaseB).lerp(pal.secondary, spikeGlow * 0.85);

        colAttr[i3] = tempCol.r;
        colAttr[i3 + 1] = tempCol.g;
        colAttr[i3 + 2] = tempCol.b;
      }

      posAttr.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.computeVertexNormals();

      // Fluid droplet tilt and rotation, faster on high-tempo sections
      group.rotation.x = pointer.y * 0.25 * motionScale;
      group.rotation.y = pointer.x * 0.35 * motionScale + animatedTime * 0.12;
    },

    dispose: () => {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
      coreGeo.dispose();
      coreMat.dispose();
    },
  };
}
