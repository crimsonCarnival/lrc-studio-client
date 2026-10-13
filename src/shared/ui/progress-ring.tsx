import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/utils';

type ProgressRingProps = {
  /** 0–100. Values outside the range are clamped. */
  value: number;
  /** Outer diameter in px. */
  size?: number;
  /** Accessible name, e.g. "Upload progress". The percentage is announced as the value. */
  label: string;
  /** Rendered in the middle of the ring, e.g. a cover thumbnail. Size it to fit inside. */
  children?: ReactNode;
  className?: string;
};

/**
 * Determinate progress as a ring (redesign sheet 08): file upload, export, per-project
 * completion. For work with no known end, use LogoLoader or SyncSweep instead.
 */
export function ProgressRing({ value, size = 56, label, children, className }: ProgressRingProps) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  // Stroke scales with the ring so a 20px ring is not a solid dot.
  const stroke = Math.max(2, Math.round(size * 0.09));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const ring = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn('shrink-0 -rotate-90 text-iris', !children && className)}
    >
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-hl" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct / 100)}
        className="transition-[stroke-dashoffset] duration-300 ease-out"
      />
    </svg>
  );

  if (!children) return ring;
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center text-iris', className)} style={{ width: size, height: size }}>
      <span className="absolute inset-0">{ring}</span>
      <span className="relative grid place-items-center">{children}</span>
    </span>
  );
}
