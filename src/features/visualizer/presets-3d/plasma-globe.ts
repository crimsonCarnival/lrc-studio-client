import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Plasma Globe 3D Audio Visualizer
 *
 * What it does:
 * - A glass sphere housing high-voltage lightning discharge filaments.
 * - Filaments reach from the central electrode and converge toward the cursor touch point.
 * - Treble controls lightning jitter frequency and active branch count.
 * - Bass pulses the central electrode volume and electrical core brightness.
 * - Hollow interior preserves full lyric legibility in the center.
 *
 * Audio mapping:
 * - Bass (bins 0-5): central core electrode expansion and glow burst.
 * - Treble (bins 28-63): filament crackle intensity and active arc count.
 * - Waveform: lightning path micro-deflection.
 *
 * Cursor behavior:
 * - Raycast to the outer glass sphere boundary (radius 9.0).
 * - Arcs congregate toward the cursor touch point on the glass, just like a real plasma ball.
 *
 * Tunable constants:
 * - GLOBE_RADIUS: 9.0
 * - CORE_RADIUS: 2.2
 * - FILAMENT_COUNT: 18
 * - POINTS_PER_FILAMENT: 24
 */

const GLOBE_RADIUS = 9.0;
const CORE_RADIUS = 2.2;
const FILAMENT_COUNT = 18;
const POINTS_PER_FILAMENT = 24;

interface Filament {
  line: THREE.Line;
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  positions: Float32Array;
  baseTargetAngle: { phi: number; theta: number };
}

export function createPlasmaGlobePreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, 24);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Outer glass sphere
  const glassGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 28, 28);
  const glassMat = new THREE.MeshBasicMaterial({
    color: palette.secondary,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
  });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  group.add(glassMesh);

  // Central electrode
  const coreGeo = new THREE.SphereGeometry(CORE_RADIUS, 18, 18);
  const coreMat = new THREE.MeshBasicMaterial({
    color: palette.tertiary,
    wireframe: true,
    transparent: true,
    opacity: 0.75,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // Lightning filaments
  const filaments: Filament[] = [];

  for (let f = 0; f < FILAMENT_COUNT; f++) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(POINTS_PER_FILAMENT * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const color = f % 2 === 0 ? palette.secondary : palette.primary;
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const line = new THREE.Line(geometry, material);
    group.add(line);

    filaments.push({
      line,
      geometry,
      material,
      positions,
      baseTargetAngle: {
        phi: Math.acos(2 * Math.random() - 1),
        theta: 2 * Math.PI * Math.random(),
      },
    });
  }

  const centerVec = new THREE.Vector3(0, 0, 0);
  const cursorOnGlobe = new THREE.Vector3(0, 0, GLOBE_RADIUS);

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
      glassMat.color.copy(pal.secondary);
      coreMat.color.copy(pal.tertiary);

      const motionScale = features?.reducedMotion ? 0.35 : 1.0;
      const treble = features ? features.treble : 0.3;
      const beatEnergy = features ? features.beatEnergy : bass * 0.5;
      const pace = features ? features.paceMultiplier : 1.0;

      // Pulse core electrode with bass
      const coreScale = 1.0 + (bass * 0.45 + beatEnergy * 0.25) * motionScale;
      coreMesh.scale.set(coreScale, coreScale, coreScale);

      // Raycast cursor to outer glass sphere
      pointer.projectToSphere(camera, centerVec, GLOBE_RADIUS, cursorOnGlobe);

      // Treble & pace drive active filament count & crackle jitter
      const activeCount = Math.max(6, Math.min(FILAMENT_COUNT, Math.floor(8 + treble * 10 + (pace - 1.0) * 4)));
      const jitterAmount = (0.35 + treble * 0.85) * motionScale * Math.min(1.8, pace);

      for (let f = 0; f < FILAMENT_COUNT; f++) {
        const filament = filaments[f];
        if (f >= activeCount) {
          filament.line.visible = false;
          continue;
        }
        filament.line.visible = true;

        // Dynamic color alternating
        filament.material.color.copy(f % 2 === 0 ? pal.secondary : pal.primary);
        filament.material.opacity = 0.5 + treble * 0.45;

        // Determine destination point on sphere:
        // First 65% of filaments gravitate toward cursor; remaining stay distributed
        const targetPoint = new THREE.Vector3();
        if (f < activeCount * 0.65) {
          // Attracted to cursor with a small stochastic spread
          const spread = 1.8 * (1 - f / activeCount);
          targetPoint.copy(cursorOnGlobe).add(
            new THREE.Vector3(
              (Math.random() - 0.5) * spread,
              (Math.random() - 0.5) * spread,
              (Math.random() - 0.5) * spread,
            ),
          ).normalize().multiplyScalar(GLOBE_RADIUS);
        } else {
          // Distributed baseline tendrils
          const ang = filament.baseTargetAngle;
          ang.theta += 0.01;
          targetPoint.set(
            GLOBE_RADIUS * Math.sin(ang.phi) * Math.cos(ang.theta),
            GLOBE_RADIUS * Math.sin(ang.phi) * Math.sin(ang.theta),
            GLOBE_RADIUS * Math.cos(ang.phi),
          );
        }

        const pos = filament.positions;

        // Generate jagged electric discharge path from core to target
        for (let p = 0; p < POINTS_PER_FILAMENT; p++) {
          const t = p / (POINTS_PER_FILAMENT - 1);
          const p3 = p * 3;

          // Straight line interpolation
          const x = targetPoint.x * t;
          const y = targetPoint.y * t;
          const z = targetPoint.z * t;

          // Parabolic envelope: maximum displacement in the middle, 0 at endpoints
          const envelope = Math.sin(t * Math.PI);

          // Audio waveform modulation + high-frequency electric jitter
          const waveSample = wave[(f * 8 + p) % wave.length] * 0.4;
          const jitterX = (Math.random() - 0.5) * jitterAmount + waveSample;
          const jitterY = (Math.random() - 0.5) * jitterAmount;
          const jitterZ = (Math.random() - 0.5) * jitterAmount;

          pos[p3] = x + jitterX * envelope;
          pos[p3 + 1] = y + jitterY * envelope;
          pos[p3 + 2] = z + jitterZ * envelope;
        }

        filament.geometry.attributes.position.needsUpdate = true;
      }

      // Gentle sphere rotation
      group.rotation.x = pointer.y * 0.25 * motionScale;
      group.rotation.y = pointer.x * 0.3 * motionScale + clock * 0.06;
    },

    dispose: () => {
      scene.remove(group);
      glassGeo.dispose();
      glassMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      for (const f of filaments) {
        f.geometry.dispose();
        f.material.dispose();
      }
    },
  };
}
