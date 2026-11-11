import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Spinner } from '@ui/skeleton';
import { Tip } from '@ui/tip';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { useSettings } from '@/features/settings/useSettings';
import { artistDisplay } from '@/features/artists/artist-credits';
import { projectPath } from '@/features/projects/project-path';
import { formatCompactAgo, formatFullDateTime } from '@/features/notifications/time-ago';
import { profilePath } from './profile-path';
import { ProjectKindBadge } from '@/features/projects/components/ProjectKindBadge';
import { useProfileShares } from './profile.queries';

type ShareUser = {
  accountName: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type SharedProjectsTabProps = {
  /** The profile being viewed: the person who did the sharing. */
  sharer: ShareUser;
  isOwner: boolean;
  /** Who is looking, for the "you" wording. Null for guests and for the owner's "view as others" preview. */
  viewerAccountName: string | null;
};

type ShareRelation = 'selfOwn' | 'selfOther' | 'mine' | 'own' | 'other' | 'unknown';

/** How the sharer, the project's owner and the viewer relate; it picks the sentence. */
function relationOf(sharer: string, owner: string | undefined, viewer: string | null): ShareRelation {
  if (!owner) return 'unknown';
  if (viewer === sharer) return owner === sharer ? 'selfOwn' : 'selfOther';
  if (owner === sharer) return 'own';
  if (owner === viewer) return 'mine';
  return 'other';
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function UserAvatar({ user, className }: { user: ShareUser; className: string }) {
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className={`${className} object-cover`} loading="lazy" decoding="async" />
  ) : (
    <InitialsAvatar name={user.displayName || user.accountName} handle={user.accountName} className={className} />
  );
}

/** The profile's "Shared" tab: other people's projects this user put on their profile. */
export function SharedProjectsTab({ sharer, isOwner, viewerAccountName }: SharedProjectsTabProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useProfileShares(sharer.accountName, true);
  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const language = i18n.resolvedLanguage || i18n.language;

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

  const sharerName = sharer.displayName || sharer.accountName;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {items.map(({ project, sharedAt, description, tags }) => {
          const ownerAccount = project.user?.accountName ?? undefined;
          const owner: ShareUser | null = ownerAccount
            ? { accountName: ownerAccount, displayName: project.user?.displayName, avatarUrl: project.user?.avatarUrl }
            : null;
          const relation = relationOf(sharer.accountName, ownerAccount, viewerAccountName);
          const href = projectPath(project, ownerAccount);
          const cover = resolveCoverImage(project);
          const title = project.metadata?.songName || project.title || t('feed.untitled');
          const artist = project.metadata ? artistDisplay(project.metadata) : '';
          const duration = project.upload?.duration;
          const lineCount = project.lineCount ?? 0;
          const syncedLineCount = project.syncedLineCount ?? 0;

          const sharerLink = (
            <Link to={profilePath(sharer.accountName)} className="font-semibold text-foreground hover:underline" />
          );
          const ownerLink = owner ? (
            <Link to={profilePath(owner.accountName)} className="font-semibold text-foreground hover:underline" />
          ) : <span />;

          return (
            <li key={project.publicId} className="glass rounded-2xl p-4 flex flex-col gap-3">
              {/* Who shared what to whom, and when. */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="relative shrink-0">
                  <UserAvatar user={sharer} className="size-9 rounded-full" />
                  {owner && owner.accountName !== sharer.accountName && (
                    <UserAvatar user={owner} className="absolute -bottom-1 -right-1 size-5 rounded-full ring-2 ring-[var(--background)]" />
                  )}
                </div>
                <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-400">
                  <Trans
                    i18nKey={`profile.shared.relation.${relation}`}
                    values={{ sharer: sharerName, owner: owner?.displayName || owner?.accountName }}
                    components={{ sharer: sharerLink, owner: ownerLink }}
                  />
                </p>
                <Tip content={formatFullDateTime(sharedAt, settings.advanced, language)}>
                  <time dateTime={sharedAt} className="shrink-0 text-xs text-zinc-500 tabular-nums">
                    {formatCompactAgo(sharedAt, t)}
                  </time>
                </Tip>
              </div>

              {/* The project itself. */}
              <div className="flex items-center gap-3 min-w-0 rounded-xl bg-raised/60 p-2.5">
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
                  {artist && <p className="truncate text-xs text-subtle">{artist}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-subtle tabular-nums">
                  {duration != null && duration > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="schedule" size={14} />
                      {formatDuration(duration)}
                    </span>
                  )}
                  <ProjectKindBadge kind={project.kind} />
                  {lineCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="sync" size={14} />
                      {t('profile.projectLines', { done: syncedLineCount, total: lineCount })}
                    </span>
                  )}
                </div>
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
