import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';

interface FollowButtonProps {
  isFollowing: boolean;
  followLoading: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
}

/**
 * Follow / following toggle with a two-step unfollow confirmation.
 * The confirmation flag is button-local; parent owns isFollowing + the API calls.
 */
export function FollowButton({ isFollowing, followLoading, onFollow, onUnfollow }: FollowButtonProps) {
  const { t } = useTranslation();
  const [confirmingUnfollow, setConfirmingUnfollow] = useState(false);

  if (!isFollowing) {
    return (
      <Button size="sm" onClick={onFollow} disabled={followLoading} className="min-w-[120px]">
        <Icon name="add" size={16} />
        {t('profile.follow')}
      </Button>
    );
  }

  if (confirmingUnfollow) {
    return (
      <Button
        variant="destructive"
        size="sm"
        onClick={() => { setConfirmingUnfollow(false); onUnfollow(); }}
        onBlur={() => setConfirmingUnfollow(false)}
        disabled={followLoading}
        className="min-w-[120px]"
      >
        {t('profile.confirmUnfollow')}
      </Button>
    );
  }

  // Hover says what a click will do (redesign sheet 10): "Following" turns into a red
  // "Unfollow". The click still asks once more before it unfollows.
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed
      onClick={() => setConfirmingUnfollow(true)}
      disabled={followLoading}
      className="group/follow min-w-[120px] hover:bg-love-soft hover:text-love-ink hover:inset-ring-love-ink"
    >
      <span className="group-hover/follow:hidden">{t('profile.following')}</span>
      <span className="hidden group-hover/follow:inline">{t('profile.mini.unfollow')}</span>
    </Button>
  );
}
