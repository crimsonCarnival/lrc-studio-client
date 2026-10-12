import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { projectsService } from '../services/projects.service.js';
import toast from 'react-hot-toast';
import { LogoLoader } from '@ui/LogoLoader';

export function BoostButton({ publicId, className = '' }: { publicId: string; className?: string }) {
  const { t } = useTranslation();
  const [boosted, setBoosted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBoost = async () => {
    if (boosted || loading) return;
    setLoading(true);
    try {
      await projectsService.boostProject(publicId);
      setBoosted(true);
      toast.success(t('projectView.boosted'));
    } catch {
      toast.error(t('projectView.boostFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBoost}
      disabled={boosted || loading}
      className={[
        'inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full border text-sm font-semibold shrink-0 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        boosted
          ? 'bg-primary/10 border-primary/30 text-primary cursor-default'
          : 'border-border text-foreground hover:bg-muted',
        'disabled:opacity-50',
        className,
      ].join(' ')}
    >
      {loading
        ? <LogoLoader size={16} />
        : <Icon name="repeat" size={16} />}
      {boosted ? t('projectView.boosted') : t('projectView.boost')}
    </button>
  );
}
