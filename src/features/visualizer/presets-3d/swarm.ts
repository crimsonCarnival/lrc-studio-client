import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Swarm 3D Audio Visualizer
 *
 * What it does:
 * - An autonomous 3D flock of 450 boids swooping through space with natural Reynolds flocking.
 * - Cursor following is disabled so the flock moves freely as an organic murmur instead of
 *   clumping onto the mouse pointer.
 * - RMS audio energy accelerates flight velocity and flight maneuverability.
 * - Detects fast-paced song parts to dramatically increase flock flight speed and banking.
 * - Spectral centroid shifts the flock's hue between low and high frequency tones.
 * - Single-draw-call InstancedMesh for 60fps performance on any device.
 *
 * Audio mapping:
 * - RMS: flock flight speed and turbulence.
 * - Pace Multiplier: accelerates flock cruising velocity and agility on fast song parts.
 * - Spectral Centroid: coloration (tertiary for bass, primary for mids, secondary for treble).
 * - Beat / Bass: sudden momentary dispersion / burst.
 *
 * Tunable constants:
 * - BOID_COUNT: 450
 * - SEPARATION_DIST: 1.8
 * - MAX_SPEED: 2.2
 */

const BOID_COUNT = 450;
const SEPARATION_DIST = 1.8;

export function createSwarmPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, 32);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Low-poly cone for each boid pointing forward along +Y
  const boidGeo = new THREE.ConeGeometry(0.32, 1.0, 4);
  boidGeo.rotateX(Math.PI / 2); // Align cone apex with +Z

  const boidMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
  });

  const instMesh = new THREE.InstancedMesh(boidGeo, boidMat, BOID_COUNT);
  group.add(instMesh);

  // Boid simulation arrays
  const posX = new Float32Array(BOID_COUNT);
  const posY = new Float32Array(BOID_COUNT);
  const posZ = new Float32Array(BOID_COUNT);

  const velX = new Float32Array(BOID_COUNT);
  const velY = new Float32Array(BOID_COUNT);
  const velZ = new Float32Array(BOID_COUNT);

  for (let i = 0; i < BOID_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 4.0 + Math.random() * 16.0;

    posX[i] = r * Math.sin(phi) * Math.cos(theta);
    posY[i] = r * Math.sin(phi) * Math.sin(theta);
    posZ[i] = (Math.random() - 0.5) * 10.0;

    velX[i] = (Math.random() - 0.5) * 0.4;
    velY[i] = (Math.random() - 0.5) * 0.4;
    velZ[i] = (Math.random() - 0.5) * 0.2;
  }

  const dummy = new THREE.Object3D();
  const targetCol = new THREE.Color();
  const flockCenter = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  return {
    update: (
      _bands,
      _wave,
      _level,
      bass,
      clock,
      _pointer: PointerTarget,
      pal: Palette3D,
      features?: AudioFeatures,
    ) => {
      const motionScale = features?.reducedMotion ? 0.35 : 1.0;
      const rms = features ? features.rms : 0.3;
      const centroid = features ? features.spectralCentroid : 0.5;
      const beatEnergy = features ? features.beatEnergy : bass * 0.5;
      const pace = features ? features.paceMultiplier : 1.0;

      // Autonomous 3D wandering attractor center that gently sweeps through space
      flockCenter.set(
        Math.sin(clock * 0.4 * pace) * 12.0 + Math.sin(clock * 0.8) * 4.0,
        Math.cos(clock * 0.35 * pace) * 8.0 + Math.sin(clock * 0.6) * 3.0,
        Math.sin(clock * 0.25 * pace) * 6.0,
      );

      // Hue calculation from spectral centroid
      if (centroid < 0.4) {
        targetCol.copy(pal.tertiary).lerp(pal.primary, centroid / 0.4);
      } else {
        targetCol.copy(pal.primary).lerp(pal.secondary, (centroid - 0.4) / 0.6);
      }

      // Flight velocity scales with RMS and fast-paced song parts
      const speedFactor = (0.7 + rms * 2.4 + (pace - 1.0) * 1.5 + beatEnergy * 1.6) * motionScale;
      const maxSpeed = 2.4 * speedFactor;

      // Flocking updates
      for (let i = 0; i < BOID_COUNT; i++) {
        let px = posX[i];
        let py = posY[i];
        let pz = posZ[i];

        let vx = velX[i];
        let vy = velY[i];
        let vz = velZ[i];

        // 1. Autonomous pursuit toward the wandering flock center
        const dx = flockCenter.x - px;
        const dy = flockCenter.y - py;
        const dz = flockCenter.z - pz;
        const distToCenter = Math.hypot(dx, dy, dz) || 1;

        // Swirling vortex component in 3D
        const swirlX = -dy / distToCenter;
        const swirlY = dx / distToCenter;

        vx += (dx / distToCenter) * 0.045 * speedFactor + swirlX * 0.035 * speedFactor;
        vy += (dy / distToCenter) * 0.045 * speedFactor + swirlY * 0.035 * speedFactor;
        vz += (dz / distToCenter) * 0.045 * speedFactor;

        // 2. Beat explosion: scatter outward dynamically
        if (beatEnergy > 0.4) {
          vx += (Math.random() - 0.5) * beatEnergy * 1.0;
          vy += (Math.random() - 0.5) * beatEnergy * 1.0;
          vz += (Math.random() - 0.5) * beatEnergy * 0.7;
        }

        // 3. Local neighbor separation (sampled for performance)
        for (let step = 1; step <= 5; step++) {
          const j = (i + step * 7) % BOID_COUNT;
          const sepDx = px - posX[j];
          const sepDy = py - posY[j];
          const sepDz = pz - posZ[j];
          const sepDist = Math.hypot(sepDx, sepDy, sepDz);
          if (sepDist > 0 && sepDist < SEPARATION_DIST) {
            const rep = (1 - sepDist / SEPARATION_DIST) * 0.06;
            vx += (sepDx / sepDist) * rep;
            vy += (sepDy / sepDist) * rep;
            vz += (sepDz / sepDist) * rep;
          }
        }

        // 4. Velocity clamp
        const currentSpeed = Math.hypot(vx, vy, vz) || 1;
        if (currentSpeed > maxSpeed) {
          vx = (vx / currentSpeed) * maxSpeed;
          vy = (vy / currentSpeed) * maxSpeed;
          vz = (vz / currentSpeed) * maxSpeed;
        }

        // Integrate position
        px += vx;
        py += vy;
        pz += vz;

        posX[i] = px;
        posY[i] = py;
        posZ[i] = pz;

        velX[i] = vx;
        velY[i] = vy;
        velZ[i] = vz;

        // 5. Update instanced mesh transform
        dummy.position.set(px, py, pz);
        lookTarget.set(px + vx, py + vy, pz + vz);
        dummy.lookAt(lookTarget);
        dummy.scale.set(1, 1, 1 + rms * 1.5 + (pace - 1.0) * 0.5);
        dummy.updateMatrix();

        instMesh.setMatrixAt(i, dummy.matrix);

        // Individual hue shading with wingbeat shimmer
        const shimmer = 0.8 + 0.4 * Math.sin(clock * 10.0 * pace + i);
        instMesh.setColorAt(
          i,
          new THREE.Color(
            targetCol.r * shimmer,
            targetCol.g * shimmer,
            targetCol.b * shimmer,
          ),
        );
      }

      instMesh.instanceMatrix.needsUpdate = true;
      if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;

      // Group ambient rotation
      group.rotation.y = clock * 0.05 * pace;
    },

    dispose: () => {
      scene.remove(group);
      boidGeo.dispose();
      boidMat.dispose();
      instMesh.dispose();
    },
  };
}
