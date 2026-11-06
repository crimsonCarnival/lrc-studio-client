import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Spinner } from '@ui/skeleton';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { formatInTimezone } from '@/shared/utils/date';
import { useSettings } from '@/features/settings/useSettings';
import { artistDisplay } from '@/features/artists/artist-credits';
import { projectPath } from '@/features/projects/project-path';
import { profilePath } from './profile-path';
import { useProfileShares } from './profile.queries';

type SharedProjectsTabProps = {
  accountName: string;
  isOwner: boolean;
};

/** The profile's "Shared" tab: other people's projects this user put on their profile. */
export function SharedProjectsTab({ accountName, isOwner }: SharedProjectsTabProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useProfileShares(accountName, true);
  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const locale = i18n.resolvedLanguage || i18n.language;

  if (isPending) {
    return <div className="flex justify-center py-16"><Spinner size={24} className="text-primary" /></div>;
  }

  if (isError || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center glass rounded-2xl">
        <div className="size-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
          <Icon name="ios_share" size={28} className="text-zinc-500" />
        </div>
        <p className="max-w-sm text-sm text-zinc-400 font-medium">
          {isOwner ? t('profile.shared.ownerEmpty') : t('profile.shared.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {items.map(({ project, sharedAt, description, tags }) => {
          const owner = project.user?.accountName;
          const href = projectPath(project, owner);
          const cover = resolveCoverImage(project);
          const title = project.metadata?.songName || project.title || t('feed.untitled');
          const artist = project.metadata ? artistDisplay(project.metadata) : '';
          return (
            <li key={project.publicId} className="glass rounded-2xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-3 min-w-0">
                {cover ? (
                  <img src={cover} alt="" className="size-12 shrink-0 rounded-lg bg-raised object-cover" loading="lazy" decoding="async" />
                ) : (
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-lg bg-raised">
                    <Icon name="music_note" size={20} className="text-subtle" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {href ? (
                    <Link to={href} className="block truncate font-semibold text-foreground hover:text-primary transition-colors">{title}</Link>
                  ) : (
                    <span className="block truncate font-semibold text-foreground">{title}</span>
                  )}
                  <p className="truncate text-xs text-subtle">
                    {artist}
                    {artist && owner && ' · '}
                    {owner && (
                      <Link to={profilePath(owner)} className="hover:underline">
                        {t('profile.shared.by', { name: project.user?.displayName || owner })}
                      </Link>
                    )}
                  </p>
                </div>
                <time dateTime={sharedAt} className="shrink-0 self-start text-xs text-zinc-500">
                  {t('profile.shared.sharedOn', {
                    date: formatInTimezone(sharedAt, settings.advanced?.timezone, { year: 'numeric', month: 'short', day: 'numeric' }, locale),
                  })}
                </time>
              </div>
              {/* The sharer's own words: plain text, escaped by React. */}
              {description && <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">{description}</p>}
              {tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label={t('projectView.shareTagsLabel')}>
                  {tags.map((tag) => (
                    <li key={tag} className="rounded-pill bg-primary-soft px-2 py-0.5 text-xs text-primary-ink">#{tag}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {hasNextPage && (
        <Button type="button" variant="outline" size="sm" className="self-center" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
          {t('feed.loadMore')}
        </Button>
      )}
    </div>
  );
}
