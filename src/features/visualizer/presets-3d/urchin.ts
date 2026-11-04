import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Urchin 3D Audio Visualizer
 *
 * What it does:
 * - A deep-sea mathematical sea urchin with 64 dynamic spines (one per FFT bin).
 * - Spines flex and rotate magnetically to point toward the cursor.
 * - Each spine extends proportionally to the energy in its specific frequency bin.
 * - Central core pulses with the bass rhythm.
 * - Tip caps glow brightly with high-frequency accents.
 *
 * Audio mapping:
 * - 64 frequency bands drive individual spine lengths (0 to 63).
 * - Bass (bins 0-5): central body respiration and whole-creature tilt.
 * - Treble: tip luminescence and sharp spine jitter.
 *
 * Cursor behavior:
 * - Spines lean and orient toward the cursor raycast in 3D space.
 *
 * Tunable constants:
 * - SPINE_COUNT: 64 (matches BAND_COUNT)
 * - CORE_RADIUS: 3.2
 * - MAX_SPINE_LENGTH: 10.0
 */

const SPINE_COUNT = 64;
const CORE_RADIUS = 3.2;

export function createUrchinPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, 24);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Central body sphere
  const coreGeo = new THREE.SphereGeometry(CORE_RADIUS, 24, 24);
  const coreMat = new THREE.MeshBasicMaterial({
    color: palette.primary,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // Fibonacci sphere spine distribution
  const baseDirs: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.3999 rad

  for (let i = 0; i < SPINE_COUNT; i++) {
    const y = 1 - (i / (SPINE_COUNT - 1)) * 2; // From 1 to -1
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    baseDirs.push(new THREE.Vector3(x, y, z).normalize());
  }

  // Instanced spine cylinders (length 1.0 unit by default, scaled dynamically)
  const spineGeo = new THREE.CylinderGeometry(0.05, 0.22, 1.0, 6);
  spineGeo.translate(0, 0.5, 0); // Pivot at spine base
  spineGeo.rotateX(Math.PI / 2); // Orient along +Z

  const spineMat = new THREE.MeshBasicMaterial({
    color: palette.secondary,
    transparent: true,
    opacity: 0.8,
  });

  const spineMesh = new THREE.InstancedMesh(spineGeo, spineMat, SPINE_COUNT);
  group.add(spineMesh);

  // Glowing tip sphere caps
  const tipGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const tipMat = new THREE.MeshBasicMaterial({
    color: palette.tertiary,
    transparent: true,
    opacity: 0.9,
  });
  const tipMesh = new THREE.InstancedMesh(tipGeo, tipMat, SPINE_COUNT);
  group.add(tipMesh);

  const dummy = new THREE.Object3D();
  const tipDummy = new THREE.Object3D();
  const centerVec = new THREE.Vector3(0, 0, 0);
  const cursorWorld = new THREE.Vector3();
  const dirToCursor = new THREE.Vector3();
  const currentDir = new THREE.Vector3();
  const spineColor = new THREE.Color();

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
      coreMat.color.copy(pal.primary);
      spineMat.color.copy(pal.secondary);
      tipMat.color.copy(pal.tertiary);

      const motionScale = features?.reducedMotion ? 0.35 : 1.0;
      const beatEnergy = features ? features.beatEnergy : bass * 0.5;
      const pace = features ? features.paceMultiplier : 1.0;

      // Pulse central body
      const coreScale = 1.0 + (bass * 0.35 + beatEnergy * 0.2) * motionScale;
      coreMesh.scale.set(coreScale, coreScale, coreScale);

      // Raycast cursor target
      pointer.projectToSphere(camera, centerVec, 14.0, cursorWorld);
      dirToCursor.copy(cursorWorld).sub(centerVec).normalize();

      for (let i = 0; i < SPINE_COUNT; i++) {
        const baseDir = baseDirs[i];
        const bandAmp = bands[i] || 0;

        // Spine length driven by this frequency bin
        const spineLength = (1.5 + Math.pow(bandAmp, 1.3) * 8.5) * motionScale;

        // Magnetically rotate spine toward cursor direction
        const alignDot = Math.max(0, baseDir.dot(dirToCursor));
        const magneticBend = (0.2 + Math.pow(alignDot, 2.0) * 0.55) * motionScale;

        currentDir.copy(baseDir).lerp(dirToCursor, magneticBend).normalize();

        // Base of spine anchored on core surface
        const baseX = baseDir.x * CORE_RADIUS * coreScale;
        const baseY = baseDir.y * CORE_RADIUS * coreScale;
        const baseZ = baseDir.z * CORE_RADIUS * coreScale;

        dummy.position.set(baseX, baseY, baseZ);
        dummy.lookAt(baseX + currentDir.x, baseY + currentDir.y, baseZ + currentDir.z);
        dummy.scale.set(1, 1, spineLength);
        dummy.updateMatrix();
        spineMesh.setMatrixAt(i, dummy.matrix);

        // Tip cap at spine tip
        const tipX = baseX + currentDir.x * spineLength;
        const tipY = baseY + currentDir.y * spineLength;
        const tipZ = baseZ + currentDir.z * spineLength;

        tipDummy.position.set(tipX, tipY, tipZ);
        tipDummy.scale.set(1 + bandAmp * 1.5, 1 + bandAmp * 1.5, 1 + bandAmp * 1.5);
        tipDummy.updateMatrix();
        tipMesh.setMatrixAt(i, tipDummy.matrix);

        // Color gradient across frequencies: bass = tertiary, mids = primary, highs = secondary
        const normIdx = i / (SPINE_COUNT - 1);
        if (normIdx < 0.35) {
          spineColor.copy(pal.tertiary).lerp(pal.primary, normIdx / 0.35);
        } else {
          spineColor.copy(pal.primary).lerp(pal.secondary, (normIdx - 0.35) / 0.65);
        }
        spineMesh.setColorAt(i, spineColor);
      }

      spineMesh.instanceMatrix.needsUpdate = true;
      if (spineMesh.instanceColor) spineMesh.instanceColor.needsUpdate = true;
      tipMesh.instanceMatrix.needsUpdate = true;

      // Group rotation following cursor parallax and idle spin
      group.rotation.x = pointer.y * 0.3 * motionScale;
      group.rotation.y = pointer.x * 0.4 * motionScale + clock * 0.08 * pace;
    },

    dispose: () => {
      scene.remove(group);
      coreGeo.dispose();
      coreMat.dispose();
      spineGeo.dispose();
      spineMat.dispose();
      spineMesh.dispose();
      tipGeo.dispose();
      tipMat.dispose();
      tipMesh.dispose();
    },
  };
}
