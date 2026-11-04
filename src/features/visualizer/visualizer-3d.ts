import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BAND_COUNT, WAVE_SAMPLES } from './visualizer-signal';
import type { Sampler } from './visualizer-presets';
import { startPointerTracker } from './visualizer-pointer';

export const VISUALIZER_3D_PRESETS = ['orb', 'terrain', 'galaxy', 'tunnel', 'pillars'] as const;
export type Visualizer3dPresetId = (typeof VISUALIZER_3D_PRESETS)[number];

export function isVisualizer3dPreset(value: unknown): value is Visualizer3dPresetId {
  return (VISUALIZER_3D_PRESETS as readonly unknown[]).includes(value);
}

interface Palette3D {
  primary: THREE.Color;
  secondary: THREE.Color;
  tertiary: THREE.Color;
}

function parseCssColor(style: CSSStyleDeclaration, prop: string, fallback: string): THREE.Color {
  const val = style.getPropertyValue(prop).trim() || fallback;
  try {
    return new THREE.Color(val);
  } catch {
    return new THREE.Color(fallback);
  }
}

function readPalette3D(el: Element): Palette3D {
  const style = getComputedStyle(el);
  return {
    primary: parseCssColor(style, '--color-primary', '#c4a7e7'),
    secondary: parseCssColor(style, '--color-accent-blue', '#9ccfd8'),
    tertiary: parseCssColor(style, '--color-love', '#eb6f92'),
  };
}

export interface Visualizer3dOptions {
  bloom?: boolean;
  preview?: boolean;
}

interface PresetInstance {
  update: (
    bands: Float32Array,
    wave: Float32Array,
    level: number,
    bass: number,
    clock: number,
    pointer: { x: number; y: number },
    palette: Palette3D,
  ) => void;
  dispose: () => void;
}

// ---------------------------------------------------------------------------
// 1. NEON AUDIO ORB
// ---------------------------------------------------------------------------
function createOrbPreset(scene: THREE.Scene, camera: THREE.PerspectiveCamera, palette: Palette3D): PresetInstance {
  camera.position.set(0, 0, 30);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Outer deformed sphere
  const detail = 24;
  const sphereGeo = new THREE.SphereGeometry(8.5, detail, detail);
  const posAttr = sphereGeo.attributes.position;
  const basePositions = new Float32Array(posAttr.array);

  const sphereMat = new THREE.MeshBasicMaterial({
    color: palette.primary,
    wireframe: true,
    transparent: true,
    opacity: 0.75,
  });
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  group.add(sphereMesh);

  // Inner glowing nucleus
  const coreGeo = new THREE.IcosahedronGeometry(4.2, 3);
  const coreMat = new THREE.MeshBasicMaterial({
    color: palette.tertiary,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // Orbiting rings
  const ringGeo = new THREE.TorusGeometry(12.5, 0.08, 12, 80);
  const ring1Mat = new THREE.MeshBasicMaterial({ color: palette.secondary, transparent: true, opacity: 0.6 });
  const ring2Mat = new THREE.MeshBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.45 });
  const ring1 = new THREE.Mesh(ringGeo, ring1Mat);
  const ring2 = new THREE.Mesh(ringGeo, ring2Mat);
  ring1.rotation.x = Math.PI / 3;
  ring2.rotation.y = Math.PI / 4;
  group.add(ring1);
  group.add(ring2);

  return {
    update: (bands, _wave, _level, bass, clock, pointer, pal) => {
      sphereMat.color.copy(pal.primary);
      coreMat.color.copy(pal.tertiary);
      ring1Mat.color.copy(pal.secondary);
      ring2Mat.color.copy(pal.primary);

      const positions = posAttr.array as Float32Array;
      const count = posAttr.count;
      const bassPulse = bass * 0.45;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const bx = basePositions[i3];
        const by = basePositions[i3 + 1];
        const bz = basePositions[i3 + 2];

        const bandIdx = i % BAND_COUNT;
        const bandAmp = bands[bandIdx] ** 1.4;
        const displacement = 1 + bandAmp * 0.35 + bassPulse * 0.25;

        positions[i3] = bx * displacement;
        positions[i3 + 1] = by * displacement;
        positions[i3 + 2] = bz * displacement;
      }
      posAttr.needsUpdate = true;

      // Pulse and rotate core
      const coreScale = 1 + bass * 0.38;
      coreMesh.scale.set(coreScale, coreScale, coreScale);
      coreMesh.rotation.y -= 0.02;
      coreMesh.rotation.x -= 0.01;

      // Spin rings
      ring1.rotation.z += 0.015 + bass * 0.02;
      ring2.rotation.x += 0.012 + bass * 0.015;

      // Tilt and sway group with cursor/touch
      group.rotation.x = clock * 0.25 + pointer.y * 0.55;
      group.rotation.y = clock * 0.35 + pointer.x * 0.75;
    },
    dispose: () => {
      scene.remove(group);
      sphereGeo.dispose();
      sphereMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ringGeo.dispose();
      ring1Mat.dispose();
      ring2Mat.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// 2. RETRO SYNTHWAVE TERRAIN
// ---------------------------------------------------------------------------
function createTerrainPreset(scene: THREE.Scene, camera: THREE.PerspectiveCamera, palette: Palette3D): PresetInstance {
  camera.position.set(0, 7.5, 18);
  camera.lookAt(0, 1.2, 0);

  const group = new THREE.Group();
  scene.add(group);

  const width = 64;
  const depth = 64;
  const segX = 40;
  const segZ = 40;
  const planeGeo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  planeGeo.rotateX(-Math.PI / 2);

  const posAttr = planeGeo.attributes.position;
  const vertexCount = posAttr.count;
  const planeMat = new THREE.MeshBasicMaterial({
    color: palette.primary,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });
  const planeMesh = new THREE.Mesh(planeGeo, planeMat);
  group.add(planeMesh);

  // Retro horizon wireframe sun
  const sunGeo = new THREE.CircleGeometry(7.5, 32);
  const sunMat = new THREE.MeshBasicMaterial({
    color: palette.secondary,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
  });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.position.set(0, 4.5, -28);
  group.add(sunMesh);

  return {
    update: (bands, wave, _level, bass, clock, pointer, pal) => {
      planeMat.color.copy(pal.primary);
      sunMat.color.copy(pal.secondary);

      const positions = posAttr.array as Float32Array;
      const speed = clock * 6;

      for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const x = positions[i3];
        const z = positions[i3 + 2];

        // Valley in center, ridges/mountains on sides
        const distFromCenter = Math.abs(x) / (width * 0.5);
        const mountainFactor = Math.pow(distFromCenter, 2.2) * 5.5;

        // Traveling ripples along Z
        const travelingWave = Math.sin((z + speed) * 0.45) * Math.cos(x * 0.35);

        // Map X position to frequency bands
        const bandIndex = Math.min(BAND_COUNT - 1, Math.floor(((x + width * 0.5) / width) * BAND_COUNT));
        const bandEnergy = bands[bandIndex] ** 1.3 * 3.8;

        // Wave ripple in center valley
        const waveIdx = Math.min(WAVE_SAMPLES - 1, Math.floor(((z + depth * 0.5) / depth) * WAVE_SAMPLES));
        const waveVal = wave[waveIdx] * 2.2;

        positions[i3 + 1] = mountainFactor * (0.8 + bandEnergy) + travelingWave * 1.2 + waveVal * (1 - distFromCenter);
      }
      posAttr.needsUpdate = true;

      // Sun swells with bass
      const sunScale = 1 + bass * 0.3;
      sunMesh.scale.set(sunScale, sunScale, 1);

      // Camera parallax with cursor/touch
      camera.position.x = pointer.x * 4;
      camera.position.y = 7.5 + pointer.y * 2.5;
      camera.lookAt(pointer.x * 1.5, 1.2, 0);
    },
    dispose: () => {
      scene.remove(group);
      planeGeo.dispose();
      planeMat.dispose();
      sunGeo.dispose();
      sunMat.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// 3. PARTICLE GALAXY
// ---------------------------------------------------------------------------
function createGalaxyPreset(scene: THREE.Scene, camera: THREE.PerspectiveCamera, palette: Palette3D): PresetInstance {
  camera.position.set(0, 0, 36);
  camera.lookAt(0, 0, 0);

  const particleCount = 2600;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  // Store metadata for orbital calculations
  const radii = new Float32Array(particleCount);
  const angles = new Float32Array(particleCount);
  const speeds = new Float32Array(particleCount);
  const armOffsets = new Float32Array(particleCount);
  const verticalOffsets = new Float32Array(particleCount);

  const arms = 3;
  for (let i = 0; i < particleCount; i++) {
    const r = Math.pow(Math.random(), 1.5) * 22 + 1.5;
    const arm = i % arms;
    const armAngle = (arm * 2 * Math.PI) / arms;
    const spiralAngle = r * 0.45;
    const spread = (Math.random() - 0.5) * (0.55 + r * 0.05);

    radii[i] = r;
    angles[i] = armAngle + spiralAngle + spread;
    speeds[i] = (0.28 / Math.sqrt(r)) * (0.8 + Math.random() * 0.4);
    armOffsets[i] = arm;
    verticalOffsets[i] = (Math.random() - 0.5) * (1.2 + r * 0.12);

    const x = Math.cos(angles[i]) * r;
    const y = Math.sin(angles[i]) * r;
    const z = verticalOffsets[i];

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Initial color gradient
    const t = Math.min(1, r / 20);
    const col = t < 0.5 ? palette.primary : palette.secondary;
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
  scene.add(points);

  return {
    update: (bands, wave, _level, bass, clock, pointer, pal) => {
      const pos = geometry.attributes.position.array as Float32Array;
      const col = geometry.attributes.color.array as Float32Array;
      const bassBurst = bass * 5.5;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        angles[i] += speeds[i] * 0.02 * (1 + bass * 1.8);
        const r = radii[i] + bassBurst * (radii[i] / 22);

        const bandIdx = Math.min(BAND_COUNT - 1, Math.floor((radii[i] / 24) * BAND_COUNT));
        const bandVal = bands[bandIdx];
        const waveIdx = Math.min(WAVE_SAMPLES - 1, i % WAVE_SAMPLES);
        const waveVal = wave[waveIdx];

        // Orbit coordinates
        const curAngle = angles[i];
        let x = Math.cos(curAngle) * r;
        let y = Math.sin(curAngle) * r;
        let z = verticalOffsets[i] * (1 + bandVal * 2.5) + waveVal * 1.5;

        // Pointer gravitational repulsion/attraction
        const dx = x - pointer.x * 16;
        const dy = y - pointer.y * 16;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 10) {
          const force = (1 - dist / 10) * 2.2;
          x += (dx / (dist + 0.1)) * force;
          y += (dy / (dist + 0.1)) * force;
          z += force * 0.8;
        }

        pos[i3] = x;
        pos[i3 + 1] = y;
        pos[i3 + 2] = z;

        // Color based on band reactivity
        const ratio = Math.min(1, radii[i] / 22);
        const chosen = ratio < 0.4 ? pal.tertiary : ratio < 0.75 ? pal.primary : pal.secondary;
        const shimmer = 1 + bandVal * 0.6;
        col[i3] = Math.min(1, chosen.r * shimmer);
        col[i3 + 1] = Math.min(1, chosen.g * shimmer);
        col[i3 + 2] = Math.min(1, chosen.b * shimmer);
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;

      // Galaxy rotation & tilt
      points.rotation.z = clock * 0.08;
      points.rotation.x = 0.55 + pointer.y * 0.45;
      points.rotation.y = pointer.x * 0.6;
    },
    dispose: () => {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// 4. HYPERSPACE GEOMETRIC TUNNEL
// ---------------------------------------------------------------------------
function createTunnelPreset(scene: THREE.Scene, camera: THREE.PerspectiveCamera, palette: Palette3D): PresetInstance {
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, -50);

  const group = new THREE.Group();
  scene.add(group);

  const ringCount = 38;
  const tunnelLength = 120;
  const ringSpacing = tunnelLength / ringCount;

  interface RingItem {
    mesh: THREE.LineLoop;
    mat: THREE.LineBasicMaterial;
    geo: THREE.BufferGeometry;
    zOffset: number;
    baseRadius: number;
    sides: number;
  }

  const rings: RingItem[] = [];

  for (let i = 0; i < ringCount; i++) {
    const sides = 6 + (i % 3) * 2; // Hexagon, Octagon, Decagon
    const radius = 6.5;
    const points: THREE.Vector3[] = [];
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const col = i % 3 === 0 ? palette.primary : i % 3 === 1 ? palette.secondary : palette.tertiary;
    const mat = new THREE.LineBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.65,
    });
    const mesh = new THREE.LineLoop(geo, mat);
    const z = 8 - i * ringSpacing;
    mesh.position.set(0, 0, z);
    group.add(mesh);

    rings.push({
      mesh,
      mat,
      geo,
      zOffset: z,
      baseRadius: radius,
      sides,
    });
  }

  return {
    update: (bands, wave, _level, bass, clock, pointer, pal) => {
      const flySpeed = 16 + bass * 22;

      for (let i = 0; i < ringCount; i++) {
        const ring = rings[i];
        ring.zOffset += flySpeed * 0.016;
        if (ring.zOffset > 10) {
          ring.zOffset -= tunnelLength;
        }

        // Distance attenuation
        const depthRatio = Math.max(0, Math.min(1, (ring.zOffset - (10 - tunnelLength)) / tunnelLength));
        ring.mat.opacity = depthRatio * 0.75 + bass * 0.2;

        const col = i % 3 === 0 ? pal.primary : i % 3 === 1 ? pal.secondary : pal.tertiary;
        ring.mat.color.copy(col);

        // Sound reaction along depth
        const bandIdx = Math.floor((1 - depthRatio) * (BAND_COUNT - 1));
        const bandPulse = bands[bandIdx] ** 1.3 * 1.8;
        const scale = 1 + bandPulse * 0.35 + (ring.zOffset > 0 ? bass * 0.4 : 0);
        ring.mesh.scale.set(scale, scale, 1);

        // Curving tunnel modulated by wave and pointer
        const curveZ = (ring.zOffset - 8) * 0.05;
        const waveIdx = Math.min(WAVE_SAMPLES - 1, Math.floor((1 - depthRatio) * (WAVE_SAMPLES - 1)));
        const waveTilt = wave[waveIdx] * 3.5;

        ring.mesh.position.x = Math.sin(curveZ + clock * 1.5) * 3.5 + pointer.x * (1 - depthRatio) * 14;
        ring.mesh.position.y = Math.cos(curveZ * 0.8 + clock * 1.2) * 2.5 + pointer.y * (1 - depthRatio) * 10 + waveTilt;
        ring.mesh.position.z = ring.zOffset;
        ring.mesh.rotation.z = clock * 0.2 + curveZ * 0.5;
      }

      camera.rotation.z = Math.sin(clock * 0.5) * 0.15 - pointer.x * 0.2;
    },
    dispose: () => {
      scene.remove(group);
      for (const r of rings) {
        r.geo.dispose();
        r.mat.dispose();
      }
    },
  };
}

// ---------------------------------------------------------------------------
// 5. 3D EQUALIZER PILLAR GRID
// ---------------------------------------------------------------------------
function createPillarsPreset(scene: THREE.Scene, camera: THREE.PerspectiveCamera, palette: Palette3D): PresetInstance {
  camera.position.set(0, 16, 25);
  camera.lookAt(0, -1, 0);

  const group = new THREE.Group();
  scene.add(group);

  const cols = 8;
  const rows = 8;
  const count = cols * rows; // 64 pillars = BAND_COUNT
  const boxGeo = new THREE.BoxGeometry(1.4, 1, 1.4);

  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.75,
  });

  const instancedMesh = new THREE.InstancedMesh(boxGeo, mat, count);
  group.add(instancedMesh);

  // Peak caps geometry
  const capGeo = new THREE.BoxGeometry(1.4, 0.18, 1.4);
  const capMat = new THREE.MeshBasicMaterial({
    color: palette.tertiary,
    transparent: true,
    opacity: 0.85,
  });
  const capMesh = new THREE.InstancedMesh(capGeo, capMat, count);
  group.add(capMesh);

  const peaks = new Float32Array(count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const spacing = 2.1;
  const offsetX = ((cols - 1) * spacing) / 2;
  const offsetZ = ((rows - 1) * spacing) / 2;

  return {
    update: (bands, _wave, _level, _bass, clock, pointer, pal) => {
      capMat.color.copy(pal.tertiary);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const x = c * spacing - offsetX;
          const z = r * spacing - offsetZ;

          // Distance from center determines band index
          const dx = c - (cols - 1) / 2;
          const dz = r - (rows - 1) / 2;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const maxDist = Math.sqrt(2) * (cols / 2);
          const bandIdx = Math.min(BAND_COUNT - 1, Math.floor((dist / maxDist) * (BAND_COUNT - 1)));

          const val = bands[bandIdx] ** 1.35;
          const height = Math.max(0.3, val * 12);

          // Update pillar height & position
          dummy.position.set(x, height / 2, z);
          dummy.scale.set(1, height, 1);
          dummy.updateMatrix();
          instancedMesh.setMatrixAt(idx, dummy.matrix);

          // Pillar color gradient from primary to secondary
          color.copy(pal.primary).lerp(pal.secondary, val);
          instancedMesh.setColorAt(idx, color);

          // Falling peak cap physics
          peaks[idx] = Math.max(height, peaks[idx] - 0.16);
          dummy.position.set(x, peaks[idx] + 0.2, z);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          capMesh.setMatrixAt(idx, dummy.matrix);
        }
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
      capMesh.instanceMatrix.needsUpdate = true;

      // Group rotation & pointer tracking
      group.rotation.y = clock * 0.18 + pointer.x * 0.7;
      group.rotation.x = pointer.y * 0.35;
    },
    dispose: () => {
      scene.remove(group);
      boxGeo.dispose();
      mat.dispose();
      capGeo.dispose();
      capMat.dispose();
    },
  };
}

// Map preset ID to its builder
const BUILDERS: Record<
  Visualizer3dPresetId,
  (scene: THREE.Scene, camera: THREE.PerspectiveCamera, palette: Palette3D) => PresetInstance
> = {
  orb: createOrbPreset,
  terrain: createTerrainPreset,
  galaxy: createGalaxyPreset,
  tunnel: createTunnelPreset,
  pillars: createPillarsPreset,
};

// ---------------------------------------------------------------------------
// MAIN 3D RUNNER
// ---------------------------------------------------------------------------
export function start3dVisualizer(
  canvas: HTMLCanvasElement,
  preset: Visualizer3dPresetId,
  sample: Sampler,
  options: Visualizer3dOptions = {},
): () => void {
  const dpr = Math.min(window.devicePixelRatio || 1, options.preview ? 1.5 : 2);
  let width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  let height = Math.max(1, Math.round(canvas.clientHeight * dpr));

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 300);

  let palette = readPalette3D(canvas);

  // Setup Post-processing Bloom
  const useBloom = options.bloom !== false && !options.preview;
  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;

  if (useBloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.95, 0.45, 0.85);
    composer.addPass(bloomPass);
  }

  const builder = BUILDERS[preset] || createOrbPreset;
  const instance = builder(scene, camera, palette);

  const pointerTracker = startPointerTracker(canvas);

  const targetBands = new Float32Array(BAND_COUNT);
  const targetWave = new Float32Array(WAVE_SAMPLES);
  const bands = new Float32Array(BAND_COUNT);
  const wave = new Float32Array(WAVE_SAMPLES);

  let resting = false;
  let frames = 0;

  const onResize = () => {
    width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    if (composer) {
      composer.setSize(width, height);
      bloomPass?.setSize(width, height);
    }
    resting = false;
  };

  const observer = new ResizeObserver(onResize);
  observer.observe(canvas);

  let raf = requestAnimationFrame(function tick(now) {
    raf = requestAnimationFrame(tick);
    const clock = now / 1000;
    const active = sample(targetBands, targetWave, clock);

    let peak = 0;
    let sum = 0;
    let bassSum = 0;
    for (let i = 0; i < BAND_COUNT; i++) {
      const v = targetBands[i];
      bands[i] += (v - bands[i]) * (v > bands[i] ? 0.6 : 0.12);
      peak = Math.max(peak, bands[i]);
      sum += bands[i];
      if (i < 6) bassSum += bands[i];
    }
    for (let j = 0; j < WAVE_SAMPLES; j++) {
      wave[j] += (targetWave[j] - wave[j]) * 0.5;
    }

    if (!active && peak < 0.004) {
      if (!resting) {
        renderer.clear();
        resting = true;
      }
      return;
    }
    resting = false;

    if (++frames % 60 === 0) {
      palette = readPalette3D(canvas);
    }

    const pointer = pointerTracker.getPointer();
    const level = sum / BAND_COUNT;
    const bass = bassSum / 6;

    instance.update(bands, wave, level, bass, clock, pointer, palette);

    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  });

  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    pointerTracker.stop();
    instance.dispose();
    composer?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
}

