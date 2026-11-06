import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/utils';

const STAFF = new Set(['mod', 'admin', 'superadmin']);

interface StaffRingProps {
  /** The user's public staff role (`staffRole` from the API). Anything else draws no ring. */
  role?: string | null;
  /** Corner radius of the avatar inside, so the ring follows its shape. Defaults to a circle. */
  className?: string;
  /** How far outside the avatar the ring sits, for avatars that already have a ring of their own. */
  outset?: number;
  children: ReactNode;
}

/**
 * A gradient ring around a staff member's avatar, wherever it appears. The gradient says
 * which kind of staff: iris to gold for devs, rose to love for admins, foam to pine for
 * mods. The ring sits outside the avatar's box, so it changes no layout. The role is
 * also in the accessible name, for anyone who cannot see the colours.
 */
export function StaffRing({ role, className, outset, children }: StaffRingProps) {
  const { t } = useTranslation();
  if (!role || !STAFF.has(role)) return <>{children}</>;
  const label = t(`common.staffRole.${role as 'mod' | 'admin' | 'superadmin'}`);
  return (
    <span
      data-staff={role}
      aria-label={label}
      className={cn('staff-ring rounded-full', className)}
      style={outset != null ? ({ '--staff-outset': `${outset}px` } as CSSProperties) : undefined}
    >
      {children}
    </span>
  );
}
