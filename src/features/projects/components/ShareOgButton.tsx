import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import { cn } from '@/shared/utils/utils';
import { projectsService } from '../services/projects.service';

function getServerOrigin() {
  if (import.meta.env.PROD) return import.meta.env.VITE_SERVER_ORIGIN || '';
  return window.location.origin;
}

interface ShareOgButtonProps {
  publicId: string;
  title?: string;
  className?: string;
}

export function ShareOgButton({ publicId, title = '', className = '' }: ShareOgButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const ogUrl = `${getServerOrigin()}/og/project/${publicId}`;
  const label = copied ? t('share.linkCopied') : t('share.shareLink');

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url: ogUrl, title: title || 'LRC Studio' });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(ogUrl);
      setCopied(true);
      // Same accounting as the overflow menu's "share link" entry.
      projectsService.incrementShare(publicId).catch(() => {});
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — do nothing
    }
  };

  return (
    <Tip content={label}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleShare}
        aria-label={label}
        className={cn('size-11 rounded-full bg-transparent text-subtle hover:text-foreground lg:size-11', className)}
      >
        {copied
          ? <Icon name="check" size={18} className="text-primary-ink" />
          : <Icon name="share" size={18} />}
      </Button>
    </Tip>
  );
}
