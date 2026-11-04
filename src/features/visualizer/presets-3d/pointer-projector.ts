import * as THREE from 'three';
import type { PointerTarget } from './types';

export interface PointerTracker3D {
  getPointer: (clock?: number, dt?: number) => PointerTarget;
  stop: () => void;
}

const IDLE_TIMEOUT_MS = 2000;
const IDLE_RAMP_SPEED = 2.0; // Seconds to transition fully to idle
const SMOOTH_LAMBDA = 9.0; // Exponential smoothing rate

/**
 * High-precision pointer tracking for 3D visualizers:
 * - Tracks pointer position in NDC [-1, 1] relative to canvas rect
 * - Exponential smoothing with frame delta time
 * - Easing to neutral / procedural idle after 2s of inactivity or leaving window
 * - Raycasting projection to 3D planes and spheres
 * - Touch support & non-blocking window listeners
 */
export function startPointerTracker3D(canvas: HTMLCanvasElement): PointerTracker3D {
  let targetX = 0;
  let targetY = 0;
  let smoothedX = 0;
  let smoothedY = 0;
  let lastActiveTime = performance.now();
  let pointerInside = true;
  let idleAmount = 0; // 0 = active pointer, 1 = fully idle

  const raycaster = new THREE.Raycaster();
  const rayPlane = new THREE.Plane();
  const raySphere = new THREE.Sphere();
  const ndcVec = new THREE.Vector2();
  const tempRay = new THREE.Ray();
  const tempVec = new THREE.Vector3();

  const updateCoords = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    targetX = ((clientX - rect.left) / rect.width) * 2 - 1;
    targetY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    targetX = Math.max(-1.25, Math.min(1.25, targetX));
    targetY = Math.max(-1.25, Math.min(1.25, targetY));
    lastActiveTime = performance.now();
    pointerInside = true;
  };

  const onPointerMove = (e: PointerEvent | MouseEvent) => {
    updateCoords(e.clientX, e.clientY);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      updateCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onPointerLeave = (e: MouseEvent | PointerEvent) => {
    // If pointer left the window, mark as not inside
    if (!e.relatedTarget && e.clientY <= 0) {
      pointerInside = false;
    }
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('mouseout', onPointerLeave, { passive: true });

  let lastFrameTime = performance.now();

  const getPointer = (clock = 0, dt?: number): PointerTarget => {
    const now = performance.now();
    const frameDt = dt !== undefined ? dt : Math.min(0.1, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    // Check idle conditions (>2s without movement or left window)
    const timeSinceActive = now - lastActiveTime;
    const isInactive = !pointerInside || timeSinceActive > IDLE_TIMEOUT_MS;

    // Smooth idle amount transition
    const targetIdle = isInactive ? 1 : 0;
    const idleStep = frameDt * IDLE_RAMP_SPEED;
    if (idleAmount < targetIdle) {
      idleAmount = Math.min(1, idleAmount + idleStep);
    } else if (idleAmount > targetIdle) {
      idleAmount = Math.max(0, idleAmount - idleStep * 2); // Quick wake-up
    }

    // Exponential smoothing for pointer motion
    const smoothFactor = 1 - Math.exp(-SMOOTH_LAMBDA * frameDt);
    smoothedX += (targetX - smoothedX) * smoothFactor;
    smoothedY += (targetY - smoothedY) * smoothFactor;

    // Procedural gentle orbit when idle so visuals stay alive with no mouse
    const idleX = Math.sin(clock * 0.75) * 0.35 + Math.sin(clock * 0.3) * 0.15;
    const idleY = Math.cos(clock * 0.6) * 0.25 + Math.cos(clock * 0.25) * 0.1;

    // Blend user pointer with idle animation
    const effectiveX = smoothedX * (1 - idleAmount) + idleX * idleAmount;
    const effectiveY = smoothedY * (1 - idleAmount) + idleY * idleAmount;

    ndcVec.set(effectiveX, effectiveY);

    const projectToPlane = (
      camera: THREE.Camera,
      planeZ = 0,
      target = new THREE.Vector3(),
    ): THREE.Vector3 => {
      raycaster.setFromCamera(ndcVec, camera);
      rayPlane.set(new THREE.Vector3(0, 0, 1), -planeZ);
      const hit = raycaster.ray.intersectPlane(rayPlane, target);
      if (hit) return target;
      // Fallback: project at fixed distance
      target.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, 20);
      target.z = planeZ;
      return target;
    };

    const projectToSphere = (
      camera: THREE.Camera,
      center: THREE.Vector3,
      radius: number,
      target = new THREE.Vector3(),
    ): THREE.Vector3 => {
      raycaster.setFromCamera(ndcVec, camera);
      raySphere.set(center, radius);
      const hit = raycaster.ray.intersectSphere(raySphere, target);
      if (hit) return target;

      // When the ray misses the sphere, project onto the sphere's silhouette/horizon
      tempRay.copy(raycaster.ray);
      tempRay.closestPointToPoint(center, tempVec);
      const toClosest = tempVec.clone().sub(center);
      if (toClosest.lengthSq() < 1e-4) {
        target.copy(center).add(new THREE.Vector3(0, 0, radius));
      } else {
        toClosest.normalize().multiplyScalar(radius);
        target.copy(center).add(toClosest);
      }
      return target;
    };

    return {
      x: effectiveX,
      y: effectiveY,
      ndc: ndcVec,
      isIdle: idleAmount > 0.5,
      idleAmount,
      projectToPlane,
      projectToSphere,
    };
  };

  const stop = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('mouseout', onPointerLeave);
  };

  return { getPointer, stop };
}
