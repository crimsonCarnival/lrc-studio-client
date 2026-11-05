import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Skyline 3D Audio Visualizer
 *
 * What it does:
 * - A neon city drifting past along the bottom edge of the stage, in two parallax layers.
 * - Each building is an equalizer bar, but kept in the lower third so the lyrics stay clear.
 *
 * Audio mapping:
 * - Bands: each building is bound to one band and grows with it.
 * - Treble: rooftop lights flicker brighter.
 * - Tempo density: how fast the city scrolls past.
 * - Beat energy: brief brightening of the building outlines.
 *
 * Tunable constants:
 * - LAYERS: per-layer count, depth, scroll speed, footprint and height range
 */

interface LayerSpec {
  count: number;
  z: number;
  speed: number;
  footprint: number;
  gap: number;
  minHeight: number;
  maxHeight: number;
  amp: number;
  fillOpacity: number;
  edgeOpacity: number;
}

const LAYERS: LayerSpec[] = [
  { count: 30, z: -26, speed: 0.9, footprint: 4.4, gap: 1.2, minHeight: 4, maxHeight: 10, amp: 13, fillOpacity: 0.06, edgeOpacity: 0.2 },
  { count: 34, z: -4, speed: 2.2, footprint: 3.2, gap: 0.9, minHeight: 1.5, maxHeight: 5, amp: 8, fillOpacity: 0.12, edgeOpacity: 0.42 },
];

const CAMERA_Y = -2;
const HALF_FOV = THREE.MathUtils.degToRad(27.5);

interface Layer {
  spec: LayerSpec;
  span: number;
  baseY: number;
  heights: Float32Array;
  bandIdx: Uint8Array;
  widths: Float32Array;
  fill: THREE.InstancedMesh;
  edges: THREE.InstancedMesh;
}

export function createSkylinePreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, CAMERA_Y, 30);
  camera.lookAt(0, CAMERA_Y, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Unit box with its base on y = 0, so scaling y grows the building upward.
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);

  const fillMat = new THREE.MeshBasicMaterial({ color: palette.primary, transparent: true, depthWrite: false });
  const edgeMat = new THREE.MeshBasicMaterial({ color: palette.secondary, wireframe: true, transparent: true });
  const backFillMat = fillMat.clone();
  const backEdgeMat = edgeMat.clone();

  let totalBuildings = 0;
  const layers: Layer[] = LAYERS.map((spec, li) => {
    const front = li === LAYERS.length - 1;
    const fMat = front ? fillMat : backFillMat;
    const eMat = front ? edgeMat : backEdgeMat;
    fMat.opacity = spec.fillOpacity;
    eMat.opacity = spec.edgeOpacity;

    const fill = new THREE.InstancedMesh(box, fMat, spec.count);
    const edges = new THREE.InstancedMesh(box, eMat, spec.count);
    group.add(fill, edges);

    const heights = new Float32Array(spec.count);
    const bandIdx = new Uint8Array(spec.count);
    const widths = new Float32Array(spec.count);
    for (let i = 0; i < spec.count; i++) {
      heights[i] = spec.minHeight + Math.random() * (spec.maxHeight - spec.minHeight);
      bandIdx[i] = 2 + Math.floor(Math.random() * 46);
      widths[i] = spec.footprint * (0.7 + Math.random() * 0.5);
    }

    // Sit each layer's ground just below the bottom of the view at that depth.
    const dist = 30 - spec.z;
    const baseY = CAMERA_Y - Math.tan(HALF_FOV) * dist - 0.5;

    totalBuildings += spec.count;
    return { spec, span: spec.count * (spec.footprint + spec.gap), baseY, heights, bandIdx, widths, fill, edges };
  });

  const roofGeo = new THREE.BufferGeometry();
  const roofPos = new Float32Array(totalBuildings * 3);
  roofGeo.setAttribute('position', new THREE.BufferAttribute(roofPos, 3));
  const roofMat = new THREE.PointsMaterial({ color: palette.tertiary, size: 0.45, transparent: true, depthWrite: false });
  group.add(new THREE.Points(roofGeo, roofMat));

  const dummy = new THREE.Object3D();
  let scroll = 0;
  let lastClock = 0;

  return {
    update: (
      bands,
      _wave,
      _level,
      _bass,
      clock,
      _pointer: PointerTarget,
      pal: Palette3D,
      features?: AudioFeatures,
    ) => {
      fillMat.color.copy(pal.primary);
      backFillMat.color.copy(pal.primary);
      edgeMat.color.copy(pal.secondary);
      backEdgeMat.color.copy(pal.primary);
      roofMat.color.copy(pal.tertiary);

      const motion = features?.reducedMotion ? 0.35 : 1.0;
      const treble = features?.treble ?? 0.2;
      const beatEnergy = features?.beatEnergy ?? 0;
      const density = features?.tempoDensity ?? 0.3;

      const dt = Math.min(0.1, Math.max(0, clock - lastClock));
      lastClock = clock;
      scroll += dt * (0.6 + density * 1.4) * motion;

      edgeMat.opacity = LAYERS[1].edgeOpacity + beatEnergy * 0.3;
      roofMat.opacity = 0.35 + treble * 0.6;
      roofMat.size = 0.35 + treble * 0.35;

      let r = 0;
      for (const layer of layers) {
        const { spec, span, baseY } = layer;
        const pitch = spec.footprint + spec.gap;
        for (let i = 0; i < spec.count; i++) {
          const raw = i * pitch - scroll * spec.speed;
          const x = (((raw % span) + span) % span) - span / 2;
          const h = layer.heights[i] + bands[layer.bandIdx[i]] * spec.amp * motion;
          const w = layer.widths[i];

          dummy.position.set(x, baseY, spec.z);
          dummy.scale.set(w, h, w);
          dummy.updateMatrix();
          layer.fill.setMatrixAt(i, dummy.matrix);
          layer.edges.setMatrixAt(i, dummy.matrix);

          const r3 = r * 3;
          roofPos[r3] = x;
          roofPos[r3 + 1] = baseY + h + 0.25;
          roofPos[r3 + 2] = spec.z;
          r++;
        }
        layer.fill.instanceMatrix.needsUpdate = true;
        layer.edges.instanceMatrix.needsUpdate = true;
      }
      roofGeo.attributes.position.needsUpdate = true;
    },

    dispose: () => {
      scene.remove(group);
      for (const l of layers) {
        l.fill.dispose();
        l.edges.dispose();
      }
      box.dispose();
      fillMat.dispose();
      edgeMat.dispose();
      backFillMat.dispose();
      backEdgeMat.dispose();
      roofGeo.dispose();
      roofMat.dispose();
    },
  };
}
