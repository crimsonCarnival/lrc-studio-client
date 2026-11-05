import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Ferrofluid 3D Audio Visualizer
 *
 * What it does:
 * - A droplet of glossy liquid metal that grows sharp cone spikes, the way real ferrofluid
 *   does under a magnet, and sinks back to a smooth blob between beats.
 * - The cursor acts as the magnet: spikes facing it grow taller.
 *
 * Why it looks like liquid metal:
 * - The mesh is indexed (vertices merged), so normals are smooth instead of faceted.
 * - Metal has no colour of its own; it shows what it reflects. The material reflects a small
 *   generated "studio" environment (bright light strips tinted by the theme palette), which
 *   gives the chrome highlights. Without an environment, a metal surface renders dark.
 *
 * Spikes:
 * - SPIKES directions are spread evenly over the sphere (Fibonacci lattice). Each vertex is
 *   bound once, at build time, to its nearest spike and a cone profile; per frame only the
 *   spike heights change, so the update is O(vertices).
 * - The profile is concave (cone^2.2), giving the narrow tips and flared bases of real spikes.
 * - Heights rise fast and fall slowly, so spikes "snap" up on hits and melt back down.
 *
 * Audio mapping:
 * - Bands: each spike is bound to a band; that band drives its height.
 * - Bass and beats: lift every spike at once.
 * - Waveform: low-amplitude surface wobble.
 *
 * Tunable constants:
 * - BASE_RADIUS: 4.6, DETAIL: 40, SPIKES: 92, SPIKE_ANGLE: 0.21 rad
 */

const BASE_RADIUS = 4.6;
const DETAIL = 40;
const SPIKES = 92;
const SPIKE_ANGLE = 0.21;
const SPIKE_COS = Math.cos(SPIKE_ANGLE);

function fibonacciSphere(count: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    points.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
  }
  return points;
}

/** Equirectangular "studio": dark surround with soft light strips, tinted by the palette. */
function paintStudio(ctx: CanvasRenderingContext2D, w: number, h: number, pal: Palette3D) {
  const dark = pal.primary.clone().multiplyScalar(0.06);
  ctx.fillStyle = dark.getStyle();
  ctx.fillRect(0, 0, w, h);

  const strip = (y: number, height: number, color: THREE.Color, alpha: number) => {
    const g = ctx.createLinearGradient(0, y - height, 0, y + height);
    const c = color.getStyle();
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(0, y - height, w, height * 2);
  };
  const white = new THREE.Color(1, 1, 1);
  strip(h * 0.22, h * 0.06, white.clone().lerp(pal.secondary, 0.25), 1);
  strip(h * 0.5, h * 0.03, pal.primary, 0.8);
  strip(h * 0.78, h * 0.1, pal.tertiary, 0.55);

  const spot = (x: number, y: number, r: number, color: THREE.Color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.getStyle());
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  spot(w * 0.25, h * 0.3, h * 0.14, white);
  spot(w * 0.7, h * 0.35, h * 0.12, pal.secondary);
  ctx.globalAlpha = 1;
}

export function createFerrofluidPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, 26);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Merge the icosahedron's duplicated vertices so computeVertexNormals produces smooth shading.
  const raw = new THREE.IcosahedronGeometry(1, DETAIL);
  raw.deleteAttribute('normal');
  raw.deleteAttribute('uv');
  const geometry = mergeVertices(raw);
  raw.dispose();

  const posAttr = geometry.attributes.position;
  const vertexCount = posAttr.count;
  const dirs = new Float32Array(posAttr.array);

  const spikeDirs = fibonacciSphere(SPIKES);
  const spikeBand = new Uint8Array(SPIKES);
  for (let k = 0; k < SPIKES; k++) spikeBand[k] = 1 + ((k * 7) % 40);

  // Bind each vertex to its nearest spike, with its cone profile (0 off-spike, 1 at the tip).
  const vertexSpike = new Uint8Array(vertexCount);
  const vertexProfile = new Float32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const x = dirs[i * 3], y = dirs[i * 3 + 1], z = dirs[i * 3 + 2];
    let best = -2;
    let bestK = 0;
    for (let k = 0; k < SPIKES; k++) {
      const s = spikeDirs[k];
      const d = x * s.x + y * s.y + z * s.z;
      if (d > best) { best = d; bestK = k; }
    }
    vertexSpike[i] = bestK;
    const cone = Math.max(0, (best - SPIKE_COS) / (1 - SPIKE_COS));
    vertexProfile[i] = Math.pow(cone, 2.2);
  }

  const envCanvas = document.createElement('canvas');
  envCanvas.width = 512;
  envCanvas.height = 256;
  const envCtx = envCanvas.getContext('2d');
  if (envCtx) paintStudio(envCtx, envCanvas.width, envCanvas.height, palette);
  const envMap = new THREE.CanvasTexture(envCanvas);
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  envMap.colorSpace = THREE.SRGBColorSpace;
  let envKey = palette.primary.getHexString() + palette.secondary.getHexString() + palette.tertiary.getHexString();

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.05, 0.055, 0.07),
    metalness: 1.0,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMap,
    envMapIntensity: 1.6,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(BASE_RADIUS);
  group.add(mesh);

  const keyLight = new THREE.DirectionalLight(palette.secondary, 2.4);
  keyLight.position.set(8, 10, 12);
  group.add(keyLight);
  const rimLight = new THREE.DirectionalLight(palette.tertiary, 2.0);
  rimLight.position.set(-12, -6, -8);
  group.add(rimLight);

  const heights = new Float32Array(SPIKES);
  const centerVec = new THREE.Vector3();
  const cursorWorld = new THREE.Vector3();
  const magnet = new THREE.Vector3();
  const localMagnet = new THREE.Vector3();
  const invQuat = new THREE.Quaternion();

  return {
    update: (
      bands,
      wave,
      _level,
      bass,
      clock,
      pointer: PointerTarget,
      pal: Palette3D,
      features?: AudioFeatures,
    ) => {
      keyLight.color.copy(pal.secondary);
      rimLight.color.copy(pal.tertiary);

      const key = pal.primary.getHexString() + pal.secondary.getHexString() + pal.tertiary.getHexString();
      if (key !== envKey && envCtx) {
        envKey = key;
        paintStudio(envCtx, envCanvas.width, envCanvas.height, pal);
        envMap.needsUpdate = true;
      }

      const motion = features?.reducedMotion ? 0.35 : 1.0;
      const beatEnergy = features?.beatEnergy ?? bass * 0.5;

      // Magnet direction in the droplet's own frame, so it stays put while the droplet turns.
      pointer.projectToSphere(camera, centerVec, BASE_RADIUS, cursorWorld);
      magnet.copy(cursorWorld).normalize();
      invQuat.copy(group.quaternion).invert();
      localMagnet.copy(magnet).applyQuaternion(invQuat);

      for (let k = 0; k < SPIKES; k++) {
        const s = spikeDirs[k];
        const facing = Math.max(0, s.x * localMagnet.x + s.y * localMagnet.y + s.z * localMagnet.z);
        const field = 0.3 + 0.7 * Math.pow(facing, 1.5);
        const target = (bands[spikeBand[k]] * 0.55 + bass * 0.3 + beatEnergy * 0.2) * field * motion;
        // Snap up on hits, melt back slowly.
        heights[k] += (target - heights[k]) * (target > heights[k] ? 0.45 : 0.06);
      }

      const positions = posAttr.array as Float32Array;
      const waveLen = wave.length;
      for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const x = dirs[i3], y = dirs[i3 + 1], z = dirs[i3 + 2];
        const wobble =
          Math.sin(x * 3.1 + clock * 1.3) * Math.sin(y * 2.7 + clock * 1.1) * 0.025 * motion
          + wave[i % waveLen] * 0.012 * motion;
        const r = 1 + wobble + vertexProfile[i] * heights[vertexSpike[i]] * 1.2;
        positions[i3] = x * r;
        positions[i3 + 1] = y * r;
        positions[i3 + 2] = z * r;
      }
      posAttr.needsUpdate = true;
      geometry.computeVertexNormals();

      group.rotation.x = pointer.y * 0.2 * motion + Math.sin(clock * 0.13) * 0.15;
      group.rotation.y = pointer.x * 0.3 * motion + clock * 0.08 * motion;
    },

    dispose: () => {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
      envMap.dispose();
    },
  };
}
