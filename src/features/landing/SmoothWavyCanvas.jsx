import { useEffect, useRef, useCallback } from 'react';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

function hexToRgb(hex) {
  const clean = hex.trim().replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return isNaN(r) ? '128, 128, 128' : `${r}, ${g}, ${b}`;
}

function readThemeColors() {
  const s = getComputedStyle(document.documentElement);
  const isLight = !document.documentElement.classList.contains('dark') &&
    !document.documentElement.classList.contains('theme-cobalt') &&
    !document.documentElement.classList.contains('theme-velvet') &&
    !document.documentElement.classList.contains('theme-sage');
  return {
    bg: s.getPropertyValue('--color-zinc-950').trim() || '#1a1826',
    primary: hexToRgb(s.getPropertyValue('--color-primary').trim() || '#c4a7e7'),
    secondary: hexToRgb(s.getPropertyValue('--color-accent-purple').trim() || '#c4a7e7'),
    accent: hexToRgb(s.getPropertyValue('--color-accent-blue').trim() || '#9ccfd8'),
    opacityScale: isLight ? 2.2 : 1,
  };
}

const SmoothWavyCanvas = ({ animationSpeed = 0.004, lineOpacity = 1 }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const animateRef = useRef(null);
  const timeRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const colorsRef = useRef(readThemeColors());
  const frameTimesRef = useRef([]);      // rolling window of last 10 frame durations (ms)
  const qualityRef = useRef(1);          // 1 = full, 0.5 = half lines, 0 = static
  const lastFrameTimeRef = useRef(0);    // timestamp of previous frame

  const reducedMotion = useReducedMotion();

  const getMouseInfluence = (x, y) => {
    const dx = x - mouseRef.current.x;
    const dy = y - mouseRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, 1 - dist / 200);
  };

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  }, []);

  const animate = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── Reduced motion: draw solid background once and stop ──────────────
    const targetFps = reducedMotion ? 0 : 60;
    if (targetFps === 0) {
      ctx.fillStyle = colorsRef.current.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // ── Frame rate cap ────────────────────────────────────────────────────
    const minInterval = 1000 / targetFps;
    if (timestamp - lastFrameTimeRef.current < minInterval) {
      rafRef.current = requestAnimationFrame(animateRef.current);
      return;
    }

    // ── Adaptive quality from rolling frame times ─────────────────────────
    const frameDelta = (timestamp || 0) - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp || 0;
    const times = frameTimesRef.current;
    times.push(frameDelta);
    if (times.length > 10) times.shift();
    const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
    if (avgMs > 20 && qualityRef.current > 0.4) qualityRef.current = Math.max(0.4, qualityRef.current - 0.1);
    else if (avgMs < 14 && qualityRef.current < 1) qualityRef.current = Math.min(1, qualityRef.current + 0.05);
    const q = qualityRef.current;

    timeRef.current += animationSpeed;
    const t = timeRef.current;
    const { width, height } = canvas;
    const { bg, primary, secondary, accent, opacityScale } = colorsRef.current;
    const opBase = lineOpacity * opacityScale;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Primary horizontal lines — scale count with quality
    const numPrimary = Math.round(35 * q);
    for (let i = 0; i < numPrimary; i++) {
      const yPos = (i / numPrimary) * height;
      const mi = getMouseInfluence(width / 2, yPos);
      const amp = 45 + 25 * Math.sin(t * 0.25 + i * 0.15) + mi * 25;
      const freq = 0.006 + 0.002 * Math.sin(t * 0.12 + i * 0.08) + mi * 0.001;
      const speed = t * (0.6 + 0.3 * Math.sin(i * 0.12)) + mi * t * 0.3;
      const opacity = (0.12 + 0.08 * Math.abs(Math.sin(t * 0.3 + i * 0.18)) + mi * 0.15) * opBase;
      ctx.beginPath();
      ctx.lineWidth = 0.6 + 0.4 * Math.sin(t + i * 0.25) + mi * 0.8;
      ctx.strokeStyle = `rgba(${primary}, ${opacity})`;
      const step = q < 0.6 ? 4 : 2;
      for (let x = 0; x < width; x += step) {
        const lmi = getMouseInfluence(x, yPos);
        const y = yPos + amp * Math.sin(x * freq + speed) + lmi * Math.sin(t * 2 + x * 0.008) * 15;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Secondary vertical lines
    const numSecondary = Math.round(25 * q);
    for (let i = 0; i < numSecondary; i++) {
      const xPos = (i / numSecondary) * width;
      const mi = getMouseInfluence(xPos, height / 2);
      const amp = 40 + 20 * Math.sin(t * 0.18 + i * 0.14) + mi * 20;
      const freq = 0.007 + 0.003 * Math.cos(t * 0.14 + i * 0.09) + mi * 0.002;
      const speed = t * (0.5 + 0.25 * Math.cos(i * 0.16)) + mi * t * 0.25;
      const opacity = (0.1 + 0.06 * Math.abs(Math.sin(t * 0.28 + i * 0.2)) + mi * 0.12) * opBase;
      ctx.beginPath();
      ctx.lineWidth = 0.5 + 0.3 * Math.sin(t + i * 0.35) + mi * 0.7;
      ctx.strokeStyle = `rgba(${secondary}, ${opacity})`;
      const step = q < 0.6 ? 4 : 2;
      for (let y = 0; y < height; y += step) {
        const lmi = getMouseInfluence(xPos, y);
        const x = xPos + amp * Math.sin(y * freq + speed) + lmi * Math.sin(t * 2 + y * 0.008) * 12;
        y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Diagonal accent lines — omit entirely at low quality
    if (q >= 0.7) {
      const numAccent = Math.round(15 * q);
      for (let i = 0; i < numAccent; i++) {
        const offset = (i / numAccent) * width * 1.5 - width * 0.25;
        const amp = 30 + 15 * Math.cos(t * 0.22 + i * 0.12);
        const phase = t * (0.4 + 0.2 * Math.sin(i * 0.13));
        const opacity = (0.06 + 0.04 * Math.abs(Math.sin(t * 0.24 + i * 0.15))) * opBase;
        ctx.beginPath();
        ctx.lineWidth = 0.4 + 0.25 * Math.sin(t + i * 0.28);
        ctx.strokeStyle = `rgba(${accent}, ${opacity})`;
        for (let j = 0; j <= 100; j++) {
          const p = j / 100;
          const baseX = offset + p * width;
          const baseY = p * height + amp * Math.sin(p * 6 + phase);
          const mi = getMouseInfluence(baseX, baseY);
          const x = baseX + mi * Math.sin(t * 1.5 + p * 6) * 8;
          const y = baseY + mi * Math.cos(t * 1.5 + p * 6) * 8;
          j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    rafRef.current = requestAnimationFrame(animateRef.current);
  }, [animationSpeed, lineOpacity, reducedMotion]);

  animateRef.current = animate;

  const handleMouseMoveRef = useRef(handleMouseMove);
  handleMouseMoveRef.current = handleMouseMove;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();

    const observer = new MutationObserver(() => {
      colorsRef.current = readThemeColors();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const handleResize = () => resizeCanvas();
    const onMouseMove = (e) => handleMouseMoveRef.current(e);
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', onMouseMove);

    animateRef.current();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', onMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      timeRef.current = 0;
    };
  }, [animate, resizeCanvas]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default SmoothWavyCanvas;
