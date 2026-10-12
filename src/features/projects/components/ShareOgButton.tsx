import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
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
      <button
        type="button"
        onClick={handleShare}
        aria-label={label}
        className={[
          'inline-grid place-items-center size-11 rounded-full border border-border text-foreground shrink-0',
          'hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          className,
        ].join(' ')}
      >
        {copied
          ? <Icon name="check" size={16} className="text-primary" />
          : <Icon name="share" size={16} />}
      </button>
    </Tip>
  );
}
