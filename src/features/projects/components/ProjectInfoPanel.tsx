import { localizeSongLanguage } from '@features/editor/utils/song-language';
import { StaffRing } from '@/shared/ui/StaffRing';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { ProjectActionsMenu } from './ProjectActionsMenu';
import { BoostButton } from './BoostButton';
import { ShareOgButton } from './ShareOgButton';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';
import type { EditorLine } from '@/features/editor/services/editor.service';

interface ProjectMeta {
  description?: string;
  songName?: string;
  songArtist?: string;
  songAlbum?: string;
  songYear?: string | number;
  songLanguage?: string;
  genre?: string;
  tags?: string[];
}

interface ProjectData {
  publicId?: string;
  title?: string;
  metadata?: ProjectMeta;
  user?: { accountName?: string; displayName?: string; avatarUrl?: string | null; staffRole?: string | null; progression?: { level?: number | null } | null };
  upload?: { duration?: number | null };
  createdAt?: string | number;
  forksEnabled?: boolean;
  isForkedByMe?: boolean;
  isBoostedByMe?: boolean;
  boostCount?: number;
  forkCount?: number;
  viewCount?: number;
  shareCount?: number;
  forkedFrom?: { publicId?: string; accountName?: string; sourceDeleted?: boolean };
  [key: string]: unknown;
}

// One segment of the joined Star / Fork / Boost group (redesign sheet 17). Counts ride on the
// action they belong to, which is what let the separate four-number stats box go.
const SEG =
  'flex items-center gap-2 h-[42px] coarse:h-11 px-3.5 text-[15px] font-semibold text-foreground whitespace-nowrap ' +
  'transition-colors duration-[var(--duration-state)] focus-visible:outline-2 focus-visible:-outline-offset-2 ' +
  'focus-visible:outline-solid focus-visible:outline-focus';
const SEG_BUTTON = 'hover:bg-raised disabled:pointer-events-none';
const SEG_COUNT = 'border-l border-hl pl-2 font-mono text-xs font-medium tabular-nums text-subtle';
const SECTION_LABEL = 'text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground';
const CARD = 'rounded-[14px] border border-border bg-card/60 p-3.5';
const CHIP = 'inline-flex h-[26px] items-center gap-1.5 rounded-full bg-raised px-2.5 text-[13px] font-semibold text-subtle';

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface ProjectInfoPanelProps {
  project: ProjectData;
  cover?: string | null;
  isOwner: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
  isStarred?: boolean;
  starCount?: number;
  starring?: boolean;
  onStar?: () => void;
  onFork?: () => void;
  onEdit?: () => void;
  reactionsSlot?: ReactNode;
  viewersSlot?: ReactNode;
  ctaSlot?: ReactNode;
  lines?: EditorLine[];
  songSingers?: string[];
  singerColors?: string[];
  /** Owned by the page: on desktop it also hides the whole column. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function ProjectInfoPanel({
  project,
  cover,
  isOwner,
  user,
  isStarred,
  starCount,
  starring,
  onStar,
  onFork,
  onEdit,
  reactionsSlot,
  viewersSlot,
  ctaSlot,
  lines,
  songSingers = [],
  singerColors = [],
  collapsed,
  onToggleCollapsed,
}: ProjectInfoPanelProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const [descExpanded, setDescExpanded] = useState(false);
  const collapseLabel = collapsed ? t('projectView.expandInfo') : t('projectView.collapseInfo');

  const meta = project?.metadata || {};
  const description = meta.description || '';
  const isLongDescription = description.length > 200;
  const accountName = project?.user?.accountName;

  const formattedDate = project?.createdAt
    ? formatInTimezone(project.createdAt, settings.advanced?.timezone, {
      year: 'numeric', month: 'short', day: 'numeric',
    }, i18n.resolvedLanguage || i18n.language)
    : null;

  const { lineCount, wordCount, hasWordTimes } = useMemo(() => {
    let lineCount = 0;
    let wordCount = 0;
    let hasWordTimes = false;
    for (const l of lines ?? []) {
      if (l.type === 'section') continue;
      lineCount++;
      wordCount += l.words?.length || (l.text?.trim() ? l.text.trim().split(/\s+/).length : 0);
      if (!hasWordTimes && l.words?.some((w) => w.time != null)) hasWordTimes = true;
    }
    return { lineCount, wordCount, hasWordTimes };
  }, [lines]);

  const locale = i18n.resolvedLanguage || i18n.language;
  const languageName = useMemo(() => {
    if (!meta.songLanguage) return null;
    // Stored as a name in the uploader's UI language, so it is translated for the viewer.
    return localizeSongLanguage(meta.songLanguage, locale);
  }, [meta.songLanguage, locale]);

  const duration = project?.upload?.duration;
  const authorName = project.user?.displayName || accountName;
  const authorLevel = project.user?.progression?.level ?? 0;
  const facts: { label: string; value: ReactNode }[] = [];
  if (languageName) facts.push({ label: t('projectView.language'), value: <span className="capitalize">{languageName}</span> });
  if (formattedDate) facts.push({ label: t('projectView.publishedOn'), value: formattedDate });
  if (accountName) {
    facts.push({
      label: t('projectView.syncedBy'),
      value: (
        <span className="flex min-w-0 items-center gap-2">
          <StaffRing role={project.user?.staffRole} outset={2.5}>
            {project.user?.avatarUrl ? (
              <img src={project.user.avatarUrl} alt="" className="size-[22px] shrink-0 rounded-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <span aria-hidden className="grid size-[22px] shrink-0 place-items-center rounded-full bg-foam-soft font-heading text-[10px] font-bold uppercase text-foam-ink">
                {(authorName ?? '').charAt(0)}
              </span>
            )}
          </StaffRing>
          <Link to={`/profile/${accountName}`} className="truncate font-bold text-foreground hover:underline">
            {authorName}
          </Link>
          {authorLevel > 0 && (
            <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-primary-soft px-[7px] font-mono text-[11px] font-semibold text-primary-ink">
              {t('settings.levelShort', { level: authorLevel })}
            </span>
          )}
        </span>
      ),
    });
  }

  const title = project?.title || meta.songName || t('projectView.notFound');
  const showSongName = !!meta.songName && meta.songName !== title;
  const albumLine = [meta.songAlbum, meta.songYear].filter(Boolean).join(' · ');
  const canFork = project?.forksEnabled !== false;

  return (
    <div className="flex flex-col gap-[18px] flex-1">
      {/* Cover + title; the overflow menu and collapse toggle sit top-right */}
      <div className="flex items-start gap-4">
        {cover && !collapsed && (
          // object-contain, not -cover: a non-square cover must never lose its
          // edges to cropping. Letterboxed on the card's own background instead.
          <img
            src={cover}
            alt={t('projectView.coverAlt', { title })}
            className="size-24 sm:size-[116px] flex-none rounded-[14px] bg-raised object-contain shadow-elevated"
            loading="eager"
            decoding="async"
          />
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1 pt-0.5">
          {/* Wraps instead of clipping: a long title grows the header, it never hides under the scroll edge. */}
          <h1 className="font-heading font-extrabold leading-none text-3xl lg:text-[34px] tracking-[-0.03em] text-foreground break-words">
            {title}
          </h1>
          {showSongName && <p className="text-[15px] text-subtle">{meta.songName}</p>}
          {meta.songArtist && <p className="text-[15px] leading-tight font-bold text-foreground">{meta.songArtist}</p>}
          {albumLine && (
            <Tip content={albumLine}>
              <p className="line-clamp-2 text-sm text-subtle">
                {meta.songAlbum && <i>{meta.songAlbum}</i>}
                {meta.songAlbum && meta.songYear && ' · '}
                {meta.songYear}
              </p>
            </Tip>
          )}
        </div>
        <div className="flex items-center self-start shrink-0 -mt-1.5 -mr-2">
          <ProjectActionsMenu
            project={project}
            lines={lines ?? []}
            isOwner={isOwner}
            user={user}
            onEdit={onEdit}
            onFork={onFork}
            triggerClassName="size-9 coarse:size-11 rounded-full shrink-0"
          />
          <Tip content={collapseLabel}>
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapseLabel}
              className="size-9 lg:size-9 coarse:size-11 rounded-full shrink-0"
            >
              <Icon name={collapsed ? 'expand_more' : 'expand_less'} size={16} />
            </Button>
          </Tip>
        </div>
      </div>

      {!collapsed && (<>
        {/* Chips: sync type first, then counts and the owner's tags */}
        {(lineCount > 0 || (meta.tags?.length ?? 0) > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {lineCount > 0 && (
              <>
                {/* Word sync is the premium state, so only it gets the iris fill. */}
                <span className={hasWordTimes ? `${CHIP} bg-primary-soft text-primary-ink` : `${CHIP} text-foreground`}>
                  <Icon name={hasWordTimes ? 'view_week' : 'subject'} size={14} className={hasWordTimes ? undefined : 'text-foam-ink'} />
                  {hasWordTimes ? t('projectView.syncByWord') : t('projectView.syncByLine')}
                </span>
                <span className={CHIP}>{t('projectView.lineCount', { count: lineCount })}</span>
                <span className={CHIP}>{t('projectView.wordCount', { count: wordCount })}</span>
              </>
            )}
            {duration ? <span className={`${CHIP} tabular-nums`}>{clock(duration)}</span> : null}
            {meta.tags?.map((tag, i) => (
              <span key={`${tag}-${i}`} className={CHIP}>{tag}</span>
            ))}
          </div>
        )}

        {/* Primary actions. A segment without a handler (your own project, or signed out)
            still shows its count, as plain text rather than a dead button. */}
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner && (
            <Button variant="outline" onClick={onEdit} className="h-[42px] gap-2 px-3.5 text-[15px] lg:h-[42px] lg:px-3.5 lg:text-[15px] coarse:h-11">
              <Icon name="edit" size={17} />
              {t('projectView.editButton')}
            </Button>
          )}
          <div role="group" aria-label={t('projectView.projectActions')} className="flex min-w-0 items-stretch divide-x divide-hl overflow-hidden rounded-[var(--radius-control)] inset-ring inset-ring-hl">
            {user && !isOwner ? (
              <button
                type="button"
                onClick={onStar}
                disabled={starring}
                aria-pressed={!!isStarred}
                className={`${SEG} ${SEG_BUTTON} ${isStarred ? 'bg-gold-soft text-gold-ink hover:bg-gold-soft' : ''}`}
              >
                {/* Keyed on the state so the pop replays on every star, not only the first. */}
                <Icon key={String(!!isStarred)} name="star" size={17} filled={isStarred} className={isStarred ? 'star-pop' : undefined} />
                {isStarred ? t('projectView.unstarButton') : t('projectView.starButton')}
                <span className={`${SEG_COUNT} ${isStarred ? 'text-gold-ink' : ''}`}>{starCount ?? 0}</span>
              </button>
            ) : (
              <span className={SEG}>
                <Icon name="star" size={17} className="text-subtle" />
                {t('projectView.statStars')}
                <span className={SEG_COUNT}>{starCount ?? 0}</span>
              </span>
            )}

            {canFork && !isOwner && !project?.isForkedByMe ? (
              <button type="button" onClick={onFork} className={`${SEG} ${SEG_BUTTON}`}>
                <Icon name="call_split" size={17} />
                {t('projectView.forkButton')}
                <span className={SEG_COUNT}>{project?.forkCount ?? 0}</span>
              </button>
            ) : (
              <span className={`${SEG} ${project?.isForkedByMe ? 'bg-primary-soft text-primary-ink' : ''}`}>
                <Icon name={project?.isForkedByMe ? 'check' : 'call_split'} size={17} className={project?.isForkedByMe ? undefined : 'text-subtle'} />
                {project?.isForkedByMe ? t('projectView.forkedBadge') : t('projectView.statForks')}
                <span className={`${SEG_COUNT} ${project?.isForkedByMe ? 'text-primary-ink' : ''}`}>{project?.forkCount ?? 0}</span>
              </span>
            )}

            {user && !user.isGuest && !isOwner ? (
              <BoostButton
                // Keyed so the local state resets when navigating between projects in a playlist.
                key={project?.publicId}
                publicId={project?.publicId ?? ''}
                initialBoosted={!!project?.isBoostedByMe}
                initialCount={project?.boostCount ?? 0}
                className={`${SEG} ${SEG_BUTTON}`}
                countClassName={SEG_COUNT}
              />
            ) : (
              <span className={SEG}>
                <Icon name="repeat" size={17} className="text-subtle" />
                {t('projectView.statBoosts')}
                <span className={SEG_COUNT}>{project?.boostCount ?? 0}</span>
              </span>
            )}
          </div>
          {project?.publicId && (
            <ShareOgButton
              publicId={project.publicId}
              title={meta.songName || title}
              subtitle={meta.songArtist}
              projectName={project.title}
              coverImage={cover}
              genre={meta.genre}
              className="size-[42px] rounded-[var(--radius-control)] lg:size-[42px] coarse:size-11"
            />
          )}
          {isOwner && ctaSlot}
        </div>

        {(reactionsSlot || (project?.viewCount ?? 0) > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {reactionsSlot}
            <span className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-xs font-medium text-subtle">
              <Icon name="visibility" size={14} />
              {t('projectView.viewCount', { count: project?.viewCount ?? 0 })}
            </span>
          </div>
        )}
        {viewersSlot && <div>{viewersSlot}</div>}

        {/* Facts */}
        {facts.length > 0 && (
          <>
            <div aria-hidden className="h-px bg-hl" />
            <dl className="grid grid-cols-[110px_1fr] gap-y-2.5 text-[15px]">
              {facts.map((fact) => (
                <div key={fact.label} className="contents">
                  <dt className="text-subtle">{fact.label}</dt>
                  <dd className="min-w-0 text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {/* Forked-from */}
        {project?.forkedFrom?.publicId && (
          project.forkedFrom.sourceDeleted ? (
            <Tip content={t('projectView.forkedFromSourceDeleted')}>
              <span className="inline-flex items-center gap-1 text-xs w-fit text-muted-foreground">
                <Icon name="open_in_new" size={12} />
                {t('projectView.forkedFrom')}
                {project.forkedFrom.accountName ? ` ${project.forkedFrom.accountName}` : ''}
              </span>
            </Tip>
          ) : (
            <Link
              to={`/project/${project.forkedFrom.publicId}`}
              className="inline-flex items-center gap-1 text-xs hover:underline w-fit text-primary"
            >
              <Icon name="open_in_new" size={12} />
              {t('projectView.forkedFrom')}
              {project.forkedFrom.accountName ? ` ${project.forkedFrom.accountName}` : ''}
            </Link>
          )
        )}

        {/* Description */}
        {description && (
          <div className={CARD}>
            <p className={`text-[13px] leading-relaxed whitespace-pre-wrap text-muted-foreground ${!descExpanded && isLongDescription ? 'line-clamp-4' : ''}`}>
              {description}
            </p>
            {isLongDescription && (
              <Button
                type="button"
                variant="link"
                size={null}
                onClick={() => setDescExpanded((v) => !v)}
                className="mt-1 text-xs"
              >
                {descExpanded ? t('projectView.showLess') : t('projectView.showMore')}
              </Button>
            )}
          </div>
        )}

        {/* Singers */}
        {songSingers && songSingers.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className={SECTION_LABEL}>{t('projectView.singers')}</span>
            <div className="flex flex-wrap gap-1.5">
              {songSingers.map((singer, idx) => {
                const color = singerColors?.[idx] || 'var(--color-primary)';
                return (
                  <span
                    key={`${singer}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-foreground"
                    style={{
                      background: `color-mix(in srgb, ${color} 10%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${color} 27%, transparent)`,
                    }}
                  >
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    {singer}
                  </span>
                );
              })}
            </div>
          </div>
        )}

      </>)}
    </div>
  );
}
