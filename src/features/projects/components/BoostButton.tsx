import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { projectsService } from '../services/projects.service.js';
import toast from 'react-hot-toast';
import { cn } from '@/shared/utils/utils';

type BoostButtonProps = {
  publicId: string;
  /** Server state at load; the button owns it from then on. */
  initialBoosted?: boolean;
  initialCount?: number;
  /** Shared segment styles from the project action group. */
  className?: string;
  countClassName?: string;
};

/** One segment of the project action group, carrying its own count (redesign sheet 17). */
export function BoostButton({ publicId, initialBoosted = false, initialCount = 0, className, countClassName }: BoostButtonProps) {
  const { t } = useTranslation();
  const [boosted, setBoosted] = useState(initialBoosted);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleBoost = async () => {
    if (boosted || loading) return;
    setLoading(true);
    try {
      await projectsService.boostProject(publicId);
      setBoosted(true);
      setCount((n) => n + 1);
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
      // A boost cannot be undone, so the pressed segment stops responding rather than toggling.
      aria-pressed={boosted}
      aria-busy={loading || undefined}
      className={cn(className, boosted && 'cursor-default bg-foam-soft text-foam-ink hover:bg-foam-soft', loading && 'cursor-progress')}
    >
      {loading
        ? <span className="eq-bars" aria-hidden="true"><i /><i /><i /></span>
        : <Icon name="repeat" size={17} />}
      {t('projectView.boost')}
      <span className={cn(countClassName, boosted && 'text-foam-ink')}>{count}</span>
    </button>
  );
}
