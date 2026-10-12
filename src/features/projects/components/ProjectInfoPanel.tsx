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
import { downloadProjectExport } from './project-export';
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
  tags?: string[];
}

interface ProjectData {
  publicId?: string;
  title?: string;
  metadata?: ProjectMeta;
  user?: { accountName?: string; displayName?: string };
  upload?: { duration?: number | null };
  createdAt?: string | number;
  forksEnabled?: boolean;
  isForkedByMe?: boolean;
  forkCount?: number;
  viewCount?: number;
  shareCount?: number;
  forkedFrom?: { publicId?: string; accountName?: string; sourceDeleted?: boolean };
  [key: string]: unknown;
}

const PILL =
  'inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full border text-sm font-semibold shrink-0 transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50';
const PILL_IDLE = 'border-border text-foreground hover:bg-muted';
const PILL_ACTIVE = 'border-primary/30 bg-primary/10 text-primary';
const SECTION_LABEL = 'text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground';
const CARD = 'rounded-[14px] border border-border bg-card/60 p-3.5';
const CHIP = 'rounded-md px-2 py-1 text-xs font-semibold';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0">
      <div className="font-heading text-[22px] font-bold leading-tight tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground truncate">{label}</div>
    </div>
  );
}

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
    try {
      return new Intl.DisplayNames([locale], { type: 'language' }).of(meta.songLanguage) ?? meta.songLanguage;
    } catch {
      return meta.songLanguage; // not a BCP 47 tag; show it as stored
    }
  }, [meta.songLanguage, locale]);

  const duration = project?.upload?.duration;
  const facts: { label: string; value: ReactNode; mono?: boolean }[] = [];
  if (duration) facts.push({ label: t('projectView.duration'), value: clock(duration), mono: true });
  if (languageName) facts.push({ label: t('projectView.language'), value: <span className="capitalize">{languageName}</span> });
  if (lineCount > 0) facts.push({ label: t('projectView.sync'), value: hasWordTimes ? t('projectView.syncLineAndWord') : t('projectView.syncLine') });
  if (formattedDate) facts.push({ label: t('projectView.publishedOn'), value: formattedDate });

  const title = project?.title || meta.songName || t('projectView.notFound');
  const showSongName = !!meta.songName && meta.songName !== title;

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Cover + title; the overflow menu and collapse toggle sit top-right */}
      <div className="flex items-end gap-4">
        {cover && !collapsed && (
          // object-contain, not -cover: a non-square cover must never lose its
          // edges to cropping. Letterboxed on the card's own background instead.
          <img
            src={cover}
            alt={t('projectView.coverAlt', { title })}
            className="size-24 sm:size-[120px] flex-none rounded-[14px] border border-border bg-card object-contain"
            loading="eager"
            decoding="async"
          />
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <h1 className="font-heading font-bold leading-none text-3xl lg:text-[38px] tracking-tight text-foreground break-words">
            {title}
          </h1>
          {showSongName && <p className="text-[13px] text-foreground/85">{meta.songName}</p>}
          {(meta.songArtist || meta.songAlbum || meta.songYear) && (
            <p className="text-[13px] leading-snug text-muted-foreground">
              {meta.songArtist && <span className="font-semibold text-foreground">{meta.songArtist}</span>}
              {meta.songAlbum && <span className={`italic ${meta.songArtist ? "before:content-['·'] before:mx-1 before:not-italic" : ''}`}>{meta.songAlbum}</span>}
              {meta.songYear && <span className={meta.songArtist || meta.songAlbum ? "before:content-['·'] before:mx-1" : ''}>{meta.songYear}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center self-start shrink-0">
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
                <span className={`${CHIP} font-bold bg-primary text-primary-foreground`}>
                  {hasWordTimes ? t('projectView.syncByWord') : t('projectView.syncByLine')}
                </span>
                <span className={`${CHIP} bg-muted text-foreground`}>{t('projectView.lineCount', { count: lineCount })}</span>
                <span className={`${CHIP} bg-muted text-foreground`}>{t('projectView.wordCount', { count: wordCount })}</span>
              </>
            )}
            {meta.tags?.map((tag, i) => (
              <span key={`${tag}-${i}`} className={`${CHIP} bg-muted text-foreground`}>{tag}</span>
            ))}
          </div>
        )}

        {/* Primary actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner ? (
            <>
              <button type="button" onClick={onEdit} className={`${PILL} ${PILL_IDLE}`}>
                <Icon name="edit" size={16} />
                {t('projectView.editButton')}
              </button>
              {ctaSlot}
            </>
          ) : (
            <>
              {user && (
                <button
                  type="button"
                  onClick={onStar}
                  disabled={starring}
                  aria-pressed={!!isStarred}
                  className={`${PILL} ${isStarred ? PILL_ACTIVE : PILL_IDLE}`}
                >
                  <Icon name="star" size={16} filled={isStarred} />
                  {isStarred ? t('projectView.unstarButton') : t('projectView.starButton')}
                </button>
              )}

              {project?.forksEnabled !== false && (
                project?.isForkedByMe ? (
                  <span className={`${PILL} ${PILL_ACTIVE}`}>
                    <Icon name="check" size={16} />
                    {t('projectView.forkedBadge')}
                  </span>
                ) : (
                  <button type="button" onClick={onFork} className={`${PILL} ${PILL_IDLE}`}>
                    <Icon name="call_split" size={16} />
                    {t('projectView.forkButton')}
                  </button>
                )
              )}

              {user && !user.isGuest && (
                <BoostButton publicId={project?.publicId ?? ''} />
              )}
            </>
          )}
          {project?.publicId && <ShareOgButton publicId={project.publicId} title={title} />}
        </div>

        {/* Stats */}
        <div className={`${CARD} grid grid-cols-4 gap-2`}>
          <Stat value={project?.viewCount ?? 0} label={t('projectView.statViews')} />
          <Stat value={starCount ?? 0} label={t('projectView.statStars')} />
          <Stat value={project?.forkCount ?? 0} label={t('projectView.statForks')} />
          <Stat value={project?.shareCount ?? 0} label={t('projectView.statShares')} />
        </div>
        {reactionsSlot && <div>{reactionsSlot}</div>}
        {viewersSlot && <div>{viewersSlot}</div>}

        {/* Facts */}
        {facts.length > 0 && (
          <dl className={`${CARD} grid grid-cols-2 gap-y-2 text-[13px]`}>
            {facts.map((fact) => (
              <div key={fact.label} className="contents">
                <dt className="text-muted-foreground">{fact.label}</dt>
                <dd className={`text-foreground ${fact.mono ? 'font-mono tabular-nums' : ''}`}>{fact.value}</dd>
              </div>
            ))}
          </dl>
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
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="text-xs mt-1 hover:underline text-primary"
              >
                {descExpanded ? t('projectView.showLess') : t('projectView.showMore')}
              </button>
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

        {/* Download: same files as the overflow menu's export entries */}
        {lineCount > 0 && (
          <div className="flex flex-col gap-2">
            <span className={SECTION_LABEL}>{t('projectView.download')}</span>
            <div className="flex flex-wrap gap-2">
              {(['lrc', 'srt'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => downloadProjectExport(format, project, lines ?? [])}
                  className="h-10 coarse:h-11 px-3.5 rounded-[10px] border border-border bg-muted/60 font-semibold text-sm text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  .{format}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Author */}
        {accountName && (
          <p className="mt-auto pt-2 flex items-center gap-2 text-[13px] text-muted-foreground">
            <span aria-hidden className="inline-grid place-items-center size-6 rounded-full bg-muted text-[11px] font-semibold uppercase text-foreground">
              {(project.user?.displayName || accountName).charAt(0)}
            </span>
            {t('projectView.syncedBy')}
            <Link to={`/profile/${accountName}`} className="font-semibold text-foreground hover:underline">
              {project.user?.displayName || accountName}
            </Link>
          </p>
        )}
      </>)}
    </div>
  );
}
