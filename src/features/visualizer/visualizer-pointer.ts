export interface PointerState {
  x: number;
  y: number;
}

export interface PointerTracker {
  getPointer: () => PointerState;
  stop: () => void;
}

/**
 * Tracks mouse and touch movement smoothly normalized to [-1, 1],
 * with easing so 3D camera and meshes follow fluidly.
 */
export function startPointerTracker(canvas: HTMLCanvasElement): PointerTracker {
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let lastMoveTime = performance.now();
  let idleRaf = 0;

  const onPointerMove = (e: PointerEvent | MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    // Normalized to [-1, 1] relative to canvas center
    targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    targetY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    // Clamp to [-1.2, 1.2]
    targetX = Math.max(-1.2, Math.min(1.2, targetX));
    targetY = Math.max(-1.2, Math.min(1.2, targetY));
    lastMoveTime = performance.now();
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    targetX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    targetY = -(((touch.clientY - rect.top) / rect.height) * 2 - 1);
    targetX = Math.max(-1.2, Math.min(1.2, targetX));
    targetY = Math.max(-1.2, Math.min(1.2, targetY));
    lastMoveTime = performance.now();
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });

  const decay = () => {
    // If no movement for 3 seconds, slowly center target back to 0
    if (performance.now() - lastMoveTime > 3000) {
      targetX *= 0.96;
      targetY *= 0.96;
    }
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    idleRaf = requestAnimationFrame(decay);
  };
  idleRaf = requestAnimationFrame(decay);

  return {
    getPointer: () => ({ x: currentX, y: currentY }),
    stop: () => {
      cancelAnimationFrame(idleRaf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onTouchMove);
    },
  };
}

