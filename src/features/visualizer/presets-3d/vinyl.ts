import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Vinyl 3D Audio Visualizer
 *
 * What it does:
 * - A large record seen at a low angle along the bottom of the stage, spinning under a tonearm.
 * - Its grooves are concentric rings that ripple with the music; the label pulses on beats.
 *
 * Audio mapping:
 * - Bands: each groove is bound to a band; louder bands lift the groove off the disc.
 * - Waveform: pushes the grooves in and out radially, so the record visibly "plays" the audio.
 * - Tempo density: spin speed (faster sections spin faster).
 * - Beats: label pulse.
 *
 * Tunable constants:
 * - GROOVES: 30 rings
 * - GROOVE_POINTS: 160 points per ring
 * - INNER_RADIUS / OUTER_RADIUS: groove area of the record
 */

const GROOVES = 30;
const GROOVE_POINTS = 160;
const INNER_RADIUS = 5.5;
const OUTER_RADIUS = 22;

interface Groove {
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  radius: number;
  band: number;
}

export function createVinylPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, 30);
  camera.lookAt(0, 0, 0);

  // Tilted frame for the turntable; the record spins inside it, the tonearm does not.
  const deck = new THREE.Group();
  deck.position.set(0, -13, -2);
  deck.rotation.x = -1.15;
  scene.add(deck);

  const disc = new THREE.Group();
  deck.add(disc);

  const grooveMatA = new THREE.LineBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.55 });
  const grooveMatB = new THREE.LineBasicMaterial({ color: palette.secondary, transparent: true, opacity: 0.45 });

  const grooves: Groove[] = [];
  for (let j = 0; j < GROOVES; j++) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(GROOVE_POINTS * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    disc.add(new THREE.LineLoop(geometry, j % 2 === 0 ? grooveMatA : grooveMatB));
    grooves.push({
      geometry,
      positions,
      radius: INNER_RADIUS + (j / (GROOVES - 1)) * (OUTER_RADIUS - INNER_RADIUS),
      band: Math.min(47, 2 + Math.floor((j / GROOVES) * 46)),
    });
  }

  const labelGeo = new THREE.CircleGeometry(4.4, 48);
  const labelMat = new THREE.MeshBasicMaterial({ color: palette.tertiary, transparent: true, opacity: 0.3, depthWrite: false });
  const label = new THREE.Mesh(labelGeo, labelMat);
  disc.add(label);

  // A notch on the label makes the spin readable.
  const notchGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.8, 0, 0.05), new THREE.Vector3(4.2, 0, 0.05)]);
  const notchMat = new THREE.LineBasicMaterial({ color: palette.tertiary, transparent: true, opacity: 0.7 });
  disc.add(new THREE.Line(notchGeo, notchMat));

  const rimGeo = new THREE.RingGeometry(OUTER_RADIUS + 0.4, OUTER_RADIUS + 0.7, 96);
  const rimMat = new THREE.MeshBasicMaterial({ color: palette.secondary, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  deck.add(new THREE.Mesh(rimGeo, rimMat));

  const armGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(25, 20, 1.6),
    new THREE.Vector3(19, 6, 1.6),
    new THREE.Vector3(15.5, 3, 1.2),
  ]);
  const armMat = new THREE.LineBasicMaterial({ color: palette.primary, transparent: true, opacity: 0.6 });
  deck.add(new THREE.Line(armGeo, armMat));

  let spin = 0;
  let lastClock = 0;

  return {
    update: (
      bands,
      wave,
      _level,
      bass,
      clock,
      _pointer: PointerTarget,
      pal: Palette3D,
      features?: AudioFeatures,
    ) => {
      grooveMatA.color.copy(pal.primary);
      grooveMatB.color.copy(pal.secondary);
      labelMat.color.copy(pal.tertiary);
      notchMat.color.copy(pal.tertiary);
      rimMat.color.copy(pal.secondary);
      armMat.color.copy(pal.primary);

      const motion = features?.reducedMotion ? 0.35 : 1.0;
      const density = features?.tempoDensity ?? 0.3;
      const beatEnergy = features?.beatEnergy ?? 0;

      const dt = Math.min(0.1, Math.max(0, clock - lastClock));
      lastClock = clock;
      spin -= dt * (0.45 + density * 0.9) * motion;
      disc.rotation.z = spin;

      const labelScale = 1 + beatEnergy * 0.12 * motion;
      label.scale.set(labelScale, labelScale, 1);
      labelMat.opacity = 0.25 + beatEnergy * 0.25;

      const waveLen = wave.length;
      for (let j = 0; j < GROOVES; j++) {
        const g = grooves[j];
        const band = bands[g.band];
        const lift = band * 1.6 * motion;
        const pos = g.positions;
        for (let p = 0; p < GROOVE_POINTS; p++) {
          const theta = (p / GROOVE_POINTS) * Math.PI * 2;
          const w = wave[(p * 2 + j * 7) % waveLen];
          const r = g.radius + w * (0.25 + bass * 0.6) * motion;
          const p3 = p * 3;
          pos[p3] = Math.cos(theta) * r;
          pos[p3 + 1] = Math.sin(theta) * r;
          pos[p3 + 2] = lift * (0.55 + 0.45 * Math.sin(theta * 3 + j * 0.6));
        }
        g.geometry.attributes.position.needsUpdate = true;
      }
    },

    dispose: () => {
      scene.remove(deck);
      for (const g of grooves) g.geometry.dispose();
      grooveMatA.dispose();
      grooveMatB.dispose();
      labelGeo.dispose();
      labelMat.dispose();
      notchGeo.dispose();
      notchMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      armGeo.dispose();
      armMat.dispose();
    },
  };
}
