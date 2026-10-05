import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { ProjectActionsMenu } from './ProjectActionsMenu';
import { BoostButton } from './BoostButton';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';

interface ProjectMeta {
  description?: string;
  songName?: string;
  songArtist?: string;
  songAlbum?: string;
  songYear?: string | number;
  tags?: string[];
}

interface ProjectData {
  publicId?: string;
  title?: string;
  metadata?: ProjectMeta;
  user?: { accountName?: string; displayName?: string };
  createdAt?: string | number;
  forksEnabled?: boolean;
  isForkedByMe?: boolean;
  forkCount?: number;
  viewCount?: number;
  shareCount?: number;
  forkedFrom?: { publicId?: string; accountName?: string; sourceDeleted?: boolean };
  [key: string]: unknown;
}

function PanelButton({ onClick, disabled, active, children, variant = 'outline' }: {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  variant?: string;
}) {
  return (
    <Button
      size="sm"
      // @ts-expect-error variant is a valid union value
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={`h-8 px-3 text-xs font-medium gap-1.5 rounded-full shrink-0 transition-all ${active ? 'bg-primary/10 text-foreground' : 'bg-transparent text-muted-foreground'}`}
    >
      {children}
    </Button>
  );
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lines?: any[];
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

  return (
    <div className="flex flex-col gap-4 rounded-2xl overflow-hidden bg-card/60 border border-border backdrop-blur-lg">
      {/* Cover art */}
      {cover && !collapsed && (
        <div className="relative w-full aspect-square overflow-hidden rounded-t-2xl">
          <img
            src={cover}
            alt={project?.title ?? ''}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
          />
          {/* Gradient overlay at bottom of cover */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/3"
            style={{ background: 'linear-gradient(to top, var(--card), transparent)' }}
          />
        </div>
      )}

      <div className={`px-4 pb-4 flex flex-col gap-3 ${cover && !collapsed ? '' : 'pt-4'}`}>

        {/* Title + actions row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold leading-tight text-base sm:text-lg tracking-tight text-foreground">
              {project?.title || t('projectView.notFound')}
            </h1>
            {(meta.songName || meta.songArtist) && (
              <p className="text-xs mt-0.5 leading-snug text-muted-foreground">
                {meta.songName && <span className="font-medium">{meta.songName}</span>}
                {meta.songArtist && <span className="before:content-['·'] before:mx-1">{meta.songArtist}</span>}
                {meta.songAlbum && <span className="before:content-['·'] before:mx-1 italic">{meta.songAlbum}</span>}
                {meta.songYear && <span className="before:content-['·'] before:mx-1">{meta.songYear}</span>}
              </p>
            )}
          </div>

          {/* Overflow menu */}
          <ProjectActionsMenu
            project={project}
            lines={lines ?? []}
            isOwner={isOwner}
            user={user}
            onEdit={onEdit}
            onFork={onFork}
          />
          <Tip content={collapseLabel}>
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapseLabel}
              className="size-8 rounded-full shrink-0"
            >
              <Icon name={collapsed ? 'expand_more' : 'expand_less'} size={16} />
            </Button>
          </Tip>
        </div>

        {!collapsed && (<>
        {/* Primary action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner ? (
            <>
              <PanelButton onClick={onEdit} variant="outline">
                <Icon name="edit" size={14} />
                {t('projectView.editButton')}
              </PanelButton>
              {ctaSlot}
            </>
          ) : (
            <>
              {user && (
                <PanelButton
                  onClick={onStar}
                  disabled={starring}
                  active={isStarred}
                >
                  <Icon name="star" size={14} filled={isStarred} />
                  {isStarred ? t('projectView.unstarButton') : t('projectView.starButton')}
                </PanelButton>
              )}

              {project?.forksEnabled !== false && (
                project?.isForkedByMe ? (
                  <span className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                    <Icon name="check" size={14} />
                    {t('projectView.forkedBadge')}
                  </span>
                ) : (
                  <PanelButton onClick={onFork}>
                    <Icon name="call_split" size={14} />
                    {t('projectView.forkButton')}
                  </PanelButton>
                )
              )}

              {user && !user.isGuest && (
                <BoostButton publicId={project?.publicId ?? ''} />
              )}
            </>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="star" size={14} />
            <span className="text-foreground">{starCount ?? 0}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="call_split" size={14} />
            <span className="text-foreground">{project?.forkCount ?? 0}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="visibility" size={14} />
            <span className="text-foreground">{project?.viewCount ?? 0}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="share" size={14} />
            <span className="text-foreground">{project?.shareCount ?? 0}</span>
          </span>
          {reactionsSlot && <div>{reactionsSlot}</div>}
        </div>
        {viewersSlot && <div className="mt-2">{viewersSlot}</div>}

        {/* Forked-from */}
        {project?.forkedFrom?.publicId && (
          project.forkedFrom.sourceDeleted ? (
            <Tip content={t('projectView.forkedFromSourceDeleted')}>
              <span className="inline-flex items-center gap-1 text-xs w-fit text-muted-foreground">
                <Icon name="open_in_new" size={12} />
                {t('projectView.forkedFrom')}
                {project.forkedFrom.accountName ? ` @${project.forkedFrom.accountName}` : ''}
              </span>
            </Tip>
          ) : (
            <Link
              to={`/project/${project.forkedFrom.publicId}`}
              className="inline-flex items-center gap-1 text-xs hover:underline w-fit text-primary"
            >
              <Icon name="open_in_new" size={12} />
              {t('projectView.forkedFrom')}
              {project.forkedFrom.accountName ? ` @${project.forkedFrom.accountName}` : ''}
            </Link>
          )
        )}

        {/* Description */}
        {description && (
          <div className="rounded-xl p-3 bg-card/40 border border-border">
            <p className={`text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground ${!descExpanded && isLongDescription ? 'line-clamp-4' : ''}`}>
              {description}
            </p>
            {isLongDescription && (
              <button
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
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('projectView.singers')}
            </span>
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

        {/* Tags */}
        {meta.tags && meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {meta.tags.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Author + date */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
          {accountName && (
            <div className="flex items-center gap-1.5">
              <Icon name="music_note" size={12} />
              <Link
                to={`/profile/${accountName}`}
                className="hover:underline text-foreground"
              >
                {project.user?.displayName || `@${accountName}`}
              </Link>
            </div>
          )}
          {formattedDate && (
            <div className="flex items-center gap-1.5">
              <Icon name="calendar_month" size={12} />
              <span>
                {t('projectView.publishedOn')} {formattedDate}
              </span>
            </div>
          )}
        </div>
        </>)}

      </div>
    </div>
  );
}
