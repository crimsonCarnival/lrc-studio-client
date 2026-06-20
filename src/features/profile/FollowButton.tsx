import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';

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
      <Button size="sm" onClick={onFollow} disabled={followLoading}>
        {t('profile.follow')}
      </Button>
    );
  }

  if (confirmingUnfollow) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => { setConfirmingUnfollow(false); onUnfollow(); }}
        disabled={followLoading}
        className="text-muted-foreground border-border"
      >
        {t('profile.confirmUnfollow')}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setConfirmingUnfollow(true)}
      disabled={followLoading}
    >
      {t('profile.following')}
    </Button>
  );
}
