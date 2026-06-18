import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Repeat2, Loader2 } from 'lucide-react';
import { projectsService } from '../services/projects.service.js';
import toast from 'react-hot-toast';

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
      onClick={handleBoost}
      disabled={boosted || loading}
      className={[
        'h-7 px-2.5 text-[11px] font-medium gap-1 rounded-lg flex items-center transition-colors',
        boosted
          ? 'bg-primary/10 border border-primary/30 text-primary cursor-default'
          : 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100',
        'disabled:opacity-50',
        className,
      ].join(' ')}
    >
      {loading
        ? <Loader2 className="size-3 animate-spin" />
        : <Repeat2 className="size-3" />}
      {boosted ? t('projectView.boosted') : t('projectView.boost')}
    </button>
  );
}
