import { InitialsAvatar } from './InitialsAvatar';
import { StaffRing } from './StaffRing';
import { cn } from '@/shared/utils/utils';

interface UserAvatarProps {
  accountName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  /** Public staff role; draws the staff ring. */
  staffRole?: string | null;
  /** Size and font size, e.g. "size-9 text-sm". */
  className?: string;
}

/** A user's round avatar: their picture, else their initial, inside the staff ring when they have one. */
export function UserAvatar({ accountName, displayName, avatarUrl, staffRole, className }: UserAvatarProps) {
  const name = displayName || accountName || '?';
  return (
    <StaffRing role={staffRole}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className={cn('shrink-0 rounded-full object-cover', className)}
        />
      ) : (
        <InitialsAvatar name={name} handle={accountName} className={cn('shrink-0 rounded-full', className)} />
      )}
    </StaffRing>
  );
}
