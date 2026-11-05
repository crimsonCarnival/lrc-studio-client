import * as THREE from 'three';
import type { Palette3D, PointerTarget, PresetInstance, Visualizer3dOptions, AudioFeatures } from './types';

/**
 * Ink 3D Audio Visualizer
 *
 * What it does:
 * - Soft clouds of coloured smoke bloom in from the edges of the stage and slowly dissolve.
 * - Puffs drift inward but fade out long before they reach the middle, so the lyrics stay clear.
 * - Deliberately low-detail: a calm, moody preset for slower songs.
 *
 * Audio mapping:
 * - Beats: spawn a burst of puffs at a random edge; louder bass means more and larger puffs.
 * - Bass: peak opacity and final size of new puffs.
 * - Mids: swirl strength of the drift.
 * - A slow ambient spawn keeps the stage alive through quiet passages.
 *
 * Uses normal (not additive) blending so the smoke stays visible on the light theme too.
 *
 * Tunable constants:
 * - POOL: 64 puffs
 * - LIFE: 4–7 s per puff
 */

const POOL = 64;
const HALF_FOV = THREE.MathUtils.degToRad(27.5);
const CAMERA_Z = 30;
const COLOR_KEYS: ReadonlyArray<keyof Palette3D> = ['primary', 'secondary', 'tertiary'];

interface Puff {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  alive: boolean;
  age: number;
  life: number;
  vx: number;
  vy: number;
  startScale: number;
  endScale: number;
  peak: number;
  spin: number;
  colorKey: keyof Palette3D;
  seed: number;
}

function makeSmokeTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.15)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createInkPreset(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  palette: Palette3D,
  _options: Visualizer3dOptions = {},
): PresetInstance {
  camera.position.set(0, 0, CAMERA_Z);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  const texture = makeSmokeTexture();
  const puffs: Puff[] = [];
  for (let i = 0; i < POOL; i++) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: palette.primary,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    group.add(sprite);
    puffs.push({
      sprite, material, alive: false, age: 0, life: 1, vx: 0, vy: 0,
      startScale: 1, endScale: 1, peak: 0, spin: 0, colorKey: 'primary', seed: Math.random() * 100,
    });
  }

  let next = 0;
  let lastClock = 0;
  let lastBurst = -Infinity;
  let ambientTimer = 0;
  let colorCursor = 0;

  const spawn = (count: number, bass: number) => {
    const halfH = Math.tan(HALF_FOV) * CAMERA_Z;
    const halfW = halfH * camera.aspect;
    // Weighted toward the sides and bottom; the top edge sits under the header.
    const side = Math.random();
    const along = Math.random() * 2 - 1;
    const colorKey = COLOR_KEYS[colorCursor++ % COLOR_KEYS.length];
    for (let k = 0; k < count; k++) {
      const p = puffs[next];
      next = (next + 1) % POOL;
      const spread = (Math.random() - 0.5) * 0.35;
      let x: number, y: number, vx: number, vy: number;
      if (side < 0.38) {
        x = -halfW - 2; y = (along + spread) * halfH; vx = 1; vy = 0;
      } else if (side < 0.76) {
        x = halfW + 2; y = (along + spread) * halfH; vx = -1; vy = 0;
      } else {
        x = (along + spread) * halfW; y = -halfH - 2; vx = 0; vy = 1;
      }
      const speed = 1.2 + Math.random() * 1.6;
      p.alive = true;
      p.age = 0;
      p.life = 4 + Math.random() * 3;
      p.vx = vx * speed + (Math.random() - 0.5) * 0.8;
      p.vy = vy * speed + (Math.random() - 0.5) * 0.8;
      p.startScale = 3 + Math.random() * 3;
      p.endScale = 11 + bass * 9 + Math.random() * 4;
      p.peak = 0.16 + bass * 0.22;
      p.spin = (Math.random() - 0.5) * 0.4;
      p.colorKey = colorKey;
      p.sprite.position.set(x, y, -2 - Math.random() * 6);
      p.material.rotation = Math.random() * Math.PI * 2;
      p.sprite.visible = true;
    }
  };

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
      const motion = features?.reducedMotion ? 0.35 : 1.0;
      const mid = features?.mid ?? 0.3;
      const dt = Math.min(0.1, Math.max(0, clock - lastClock));
      lastClock = clock;

      if (features?.beat && clock - lastBurst > 0.3) {
        lastBurst = clock;
        spawn(2 + Math.floor(bass * 3), bass);
      }
      ambientTimer += dt;
      if (ambientTimer > 1.4) {
        ambientTimer = 0;
        spawn(1, bass * 0.5);
      }

      for (const p of puffs) {
        if (!p.alive) continue;
        p.age += dt;
        const t = p.age / p.life;
        if (t >= 1) {
          p.alive = false;
          p.sprite.visible = false;
          continue;
        }
        // Inward drift slows down as the puff spreads, with a gentle swirl.
        const drag = 1 - t * 0.8;
        const swirl = (0.4 + mid * 1.2) * motion;
        p.sprite.position.x += (p.vx * drag + Math.sin(clock * 0.7 + p.seed) * swirl) * dt * motion;
        p.sprite.position.y += (p.vy * drag + Math.cos(clock * 0.6 + p.seed) * swirl) * dt * motion;

        const s = p.startScale + (p.endScale - p.startScale) * Math.sqrt(t);
        p.sprite.scale.set(s, s, 1);
        p.material.rotation += p.spin * dt * motion;
        p.material.opacity = p.peak * Math.min(1, t * 6) * Math.pow(1 - t, 1.5);
        p.material.color.copy(pal[p.colorKey]);
      }
    },

    dispose: () => {
      scene.remove(group);
      for (const p of puffs) p.material.dispose();
      texture.dispose();
    },
  };
}
