import { useTranslation } from 'react-i18next';
import { StaffRing } from '@/shared/ui/StaffRing';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { LazyImage } from '@ui/LazyImage';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import type { AuthUser } from '@/features/auth/auth.types';

/** Phone header, signed in: the bell and an avatar that opens the navigation drawer. */
export function PhoneNavAccount({ user, unverified, onOpen }: { user: AuthUser; unverified: boolean; onOpen: () => void }) {
  const { t } = useTranslation();
  const name = user.displayName || user.accountName || user.email || '';
  return (
    <>
      <NotificationBell />
      <div className="relative ml-1 shrink-0">
        <StaffRing role={user.staffRole} outset={3.5}>
          <button
            type="button"
            onClick={onOpen}
            aria-label={t('nav.menu')}
            aria-haspopup="dialog"
            className="relative block size-10 coarse:size-11 cursor-pointer overflow-hidden rounded-full bg-primary-soft shadow-[0_0_0_2px_var(--background),0_0_0_3.5px_var(--hl)] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-focus"
          >
            {user.avatarUrl
              ? <LazyImage src={user.avatarUrl} alt="" className="size-full object-cover" />
              : <InitialsAvatar name={name} handle={user.accountName} className="size-full text-[17px]" />}
          </button>
        </StaffRing>
        {unverified && (
          <span aria-hidden="true" className="pointer-events-none absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-zinc-950 bg-amber-400" />
        )}
      </div>
    </>
  );
}
