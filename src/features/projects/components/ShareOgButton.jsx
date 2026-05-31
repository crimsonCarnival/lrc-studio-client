import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, Check } from 'lucide-react';

function getServerOrigin() {
  if (import.meta.env.PROD) return import.meta.env.VITE_SERVER_ORIGIN || '';
  return window.location.origin;
}

export function ShareOgButton({ projectId, title = '', className = '' }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const ogUrl = `${getServerOrigin()}/og/project/${projectId}`;

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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — do nothing
    }
  };

  return (
    <button
      onClick={handleShare}
      className={[
        'h-7 px-2.5 text-[11px] font-medium gap-1 rounded-lg flex items-center',
        'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors',
        className,
      ].join(' ')}
    >
      {copied
        ? <Check className="size-3 text-primary" />
        : <Share2 className="size-3" />}
      {copied ? t('share.linkCopied') : t('share.shareLink')}
    </button>
  );
}
