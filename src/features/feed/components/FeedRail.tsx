import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { sessionPath, projectDisplayName } from '@/features/projects/project-path';
import { useMySessions } from '@/features/collab/hooks/useMySessions';
import { SuggestedUsers } from '@/features/explore/components/SuggestedUsers';

const SESSIONS_SHOWN = 3;
const CARD = 'flex flex-col gap-3 rounded-[var(--radius-card)] bg-raised p-[18px] inset-ring inset-ring-hl';

/** The feed's side column on wide screens: live sessions, then people to follow. */
export function FeedRail() {
  const { t } = useTranslation();
  const tk = t as unknown as (k: string, o?: Record<string, unknown>) => string;
  const { sessions } = useMySessions();

  return (
    <aside aria-label={t('feed.rail.label')} className="sticky top-6 hidden w-[320px] shrink-0 flex-col gap-4 lg:flex">
      <section aria-labelledby="rail-sessions" className={CARD}>
        <div className="flex items-center justify-between gap-3">
          <h2 id="rail-sessions" className="font-heading text-[15px] font-semibold text-foreground">{t('feed.rail.sessions')}</h2>
          <Link to="/sessions" className="text-[13px] font-medium text-primary-ink hover:text-foreground">{t('feed.rail.seeAll')}</Link>
        </div>
        {sessions.length === 0 ? (
          <p className="text-[13px] text-subtle">
            {t('feed.rail.noSessions')}{' '}
            <Link to="/sessions" className="font-medium text-primary-ink hover:text-foreground">{t('feed.rail.startOne')}</Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.slice(0, SESSIONS_SHOWN).map((s) => {
              const name = projectDisplayName({ title: s.title, metadata: { songName: s.songName, songArtist: s.songArtist } }) || t('collab.sessions.untitled');
              return (
                <li key={s.publicId}>
                  <Link to={sessionPath(s.publicId)} className="group flex items-center gap-3 rounded-[var(--radius-control)] bg-background/60 p-2.5 transition-shadow hover:inset-ring hover:inset-ring-hl">
                    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[calc(var(--radius)*0.8)] bg-primary-soft">
                      {s.coverImage
                        ? <img src={s.coverImage} alt="" className="size-full object-cover" />
                        : <Icon name="music_note" size={18} className="text-primary-ink/70" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle">
                        <span className="size-2 rounded-full bg-love" aria-hidden="true" />
                        {t('feed.rail.live')} · {tk('collab.sessions.members', { count: s.memberCount })}
                      </span>
                    </span>
                    <Icon name="chevron_right" size={18} className="text-subtle" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <SuggestedUsers limit={3} variant="rail" className={CARD} />
    </aside>
  );
}
