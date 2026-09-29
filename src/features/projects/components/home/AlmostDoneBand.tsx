import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { ProjectListCover } from '@/features/projects/components/ProjectListCover';

export interface AlmostDoneProject {
  publicId: string;
  title?: string;
  coverImage?: string;
  lineCount?: number;
  syncedLineCount?: number;
  metadata?: { songArtist?: string; genre?: string };
}

const MAX_SHOWN = 4;

/**
 * Projects that are started but not finished, nearest to completion first.
 *
 * The `synced > 0` condition is load-bearing: an untouched project is "not
 * started", not "almost done", and mixing the two makes the band meaningless as
 * a to-do list. Renders nothing when nothing qualifies.
 */
export function AlmostDoneBand({
  projects,
  onOpen,
}: {
  projects: AlmostDoneProject[];
  onOpen: (publicId: string) => void;
}) {
  const { t } = useTranslation();

  const items = useMemo(() => (
    projects
      .filter(p => {
        const total = p.lineCount ?? 0;
        const synced = p.syncedLineCount ?? 0;
        return total > 0 && synced > 0 && synced < total;
      })
      .map(p => ({
        ...p,
        pct: Math.min(99, Math.round(((p.syncedLineCount ?? 0) / (p.lineCount ?? 1)) * 100)),
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, MAX_SHOWN)
  ), [projects]);

  if (items.length === 0) return null;

  return (
    <section className="lg:w-2/5 lg:shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="pending_actions" size={16} className="text-primary" />
        <h2 className="text-sm font-bold text-zinc-300">{t('home.almostDone')}</h2>
        <span className="text-[11px] text-zinc-500">{t('home.almostDoneSub')}</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:grid sm:grid-cols-2 sm:overflow-visible">
        {items.map(p => (
          <button
            key={p.publicId}
            type="button"
            onClick={() => onOpen(p.publicId)}
            className="shrink-0 w-56 sm:w-auto text-left glass rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition-colors focus:ring-2 focus:ring-primary/30 outline-none"
          >
            <ProjectListCover
              coverImage={p.coverImage}
              genre={p.metadata?.genre}
              className="size-10 shrink-0"
            />
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-zinc-100 truncate">
                {p.title || t('library.untitled')}
              </span>
              <span className="block text-[10px] text-zinc-500 truncate">
                {p.syncedLineCount} / {p.lineCount} {t('home.lines')}
              </span>
              <span className="mt-1.5 block h-[3px] w-full bg-zinc-800 rounded-full overflow-hidden">
                <span className="block h-full bg-primary rounded-full" style={{ width: `${p.pct}%` }} />
              </span>
            </span>
            <span className="text-[11px] font-bold text-primary tabular-nums shrink-0">{p.pct}%</span>
          </button>
        ))}
      </div>
    </section>
  );
}
