import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/utils';

type ChipTone = 'iris' | 'foam' | 'gold' | 'love' | 'neutral';

const TONES: Record<ChipTone, string> = {
  iris: 'bg-primary-soft text-primary-ink',
  foam: 'bg-foam-soft text-foam-ink',
  gold: 'bg-gold-soft text-gold-ink',
  love: 'bg-love-soft text-love-ink',
  neutral: 'bg-raised text-subtle',
};

/** Colour a role is shown in: staff in iris, moderators in foam, everyone else neutral. */
const ROLE_TONE: Record<string, ChipTone> = { superadmin: 'iris', admin: 'iris', mod: 'foam' };

/**
 * A small label for a role or an account status (redesign sheet 10). The tone carries the
 * meaning: foam is fine, gold needs attention, love is blocked.
 */
export function StatusChip({ tone, role, className, children }: {
  tone?: ChipTone;
  /** A user role, when the chip names one: picks the tone unless `tone` is given. */
  role?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const resolved = tone ?? ROLE_TONE[role ?? ''] ?? 'neutral';
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-[5px] whitespace-nowrap rounded-full px-[9px] font-mono text-[11px] font-semibold uppercase leading-none tracking-[0.08em]',
        TONES[resolved],
        className,
      )}
    >
      {children}
    </span>
  );
}
