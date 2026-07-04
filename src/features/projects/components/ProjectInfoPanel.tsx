import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { ProjectActionsMenu } from './ProjectActionsMenu';
import { BoostButton } from './BoostButton';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';

interface Palette {
  fg?: string;
  faded?: string;
  nearer?: string;
  accent?: string;
  bg?: string;
}

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
  forkedFrom?: { publicId?: string; accountName?: string };
  [key: string]: unknown;
}

// Theming helper — returns inline style overrides when a palette is active
function themed(palette?: Palette | null, overrides: CSSProperties = {}): CSSProperties {
  if (!palette) return overrides;
  return {
    color: palette.fg,
    ...overrides,
  };
}

function PanelButton({ onClick, disabled, active, children, palette, variant = 'outline' }: {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  palette?: Palette | null;
  variant?: string;
}) {
  const base: CSSProperties = {
    borderColor: palette ? palette.faded : undefined,
    color: palette ? (active ? palette.fg : palette.nearer) : undefined,
    background: active && palette ? `${palette.accent}22` : 'transparent',
    transition: 'all 0.2s ease',
  };

  return (
    <Button
      size="sm"
      // @ts-expect-error variant is a valid union value
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      style={base}
      className="h-8 px-3 text-xs font-medium gap-1.5 rounded-full shrink-0"
    >
      {children}
    </Button>
  );
}

interface ProjectInfoPanelProps {
  project: ProjectData;
  cover?: string | null;
  palette?: Palette | null;
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
  ctaSlot?: ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lines?: any[];
}

export default function ProjectInfoPanel({
  project,
  cover,
  palette,
  isOwner,
  user,
  isStarred,
  starCount,
  starring,
  onStar,
  onFork,
  onEdit,
  reactionsSlot,
  ctaSlot,
  lines,
}: ProjectInfoPanelProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const [descExpanded, setDescExpanded] = useState(false);

  const meta = project?.metadata || {};
  const description = meta.description || '';
  const isLongDescription = description.length > 200;
  const accountName = project?.user?.accountName;

  const formattedDate = project?.createdAt
    ? formatInTimezone(project.createdAt, settings.advanced?.timezone, {
        year: 'numeric', month: 'short', day: 'numeric',
      }, i18n.resolvedLanguage || i18n.language)
    : null;

  const panelBg = palette
    ? `${palette.bg}cc`
    : 'hsl(var(--card) / 0.6)';

  const borderColor = palette
    ? `${palette.faded}44`
    : 'hsl(var(--border))';

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl overflow-hidden"
      style={{
        background: panelBg,
        border: `1px solid ${borderColor}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Cover art */}
      {cover && (
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
            style={{ background: `linear-gradient(to top, ${palette?.bg ?? 'hsl(var(--background))'}, transparent)` }}
          />
        </div>
      )}

      <div className="px-4 pb-4 flex flex-col gap-3">

        {/* Title + actions row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1
              className="font-semibold leading-tight text-base sm:text-lg tracking-tight"
              style={themed(palette)}
            >
              {project?.title || t('projectView.notFound')}
            </h1>
            {(meta.songName || meta.songArtist) && (
              <p
                className="text-xs mt-0.5 leading-snug"
                style={{ color: palette?.nearer ?? 'hsl(var(--muted-foreground))' }}
              >
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
            palette={palette as { faded: string } | null | undefined}
            onEdit={onEdit}
            onFork={onFork}
          />
        </div>

        {/* Primary action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner ? (
            <>
              <PanelButton onClick={onEdit} palette={palette} variant="outline">
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
                  palette={palette}
                >
                  <Icon name="star" size={14} filled={isStarred} />
                  {isStarred ? t('projectView.unstarButton') : t('projectView.starButton')}
                </PanelButton>
              )}

              {project?.forksEnabled !== false && (
                project?.isForkedByMe ? (
                  <span
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-full"
                    style={{
                      background: palette ? `${palette.accent}22` : 'hsl(var(--primary) / 0.1)',
                      color: palette?.accent ?? 'hsl(var(--primary))',
                      border: `1px solid ${palette ? `${palette.accent}44` : 'hsl(var(--primary) / 0.2)'}`,
                    }}
                  >
                    <Icon name="check" size={14} />
                    {t('projectView.forkedBadge')}
                  </span>
                ) : (
                  <PanelButton onClick={onFork} palette={palette}>
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
        <div
          className="flex items-center gap-4 text-xs"
          style={{ color: palette?.faded ?? 'hsl(var(--muted-foreground))' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon name="star" size={14} />
            <span style={{ color: palette?.nearer ?? 'hsl(var(--foreground))' }}>{starCount ?? 0}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="call_split" size={14} />
            <span style={{ color: palette?.nearer ?? 'hsl(var(--foreground))' }}>{project?.forkCount ?? 0}</span>
          </span>
          {reactionsSlot && <div>{reactionsSlot}</div>}
        </div>

        {/* Forked-from */}
        {project?.forkedFrom?.publicId && (
          <Link
            to={`/project/${project.forkedFrom.publicId}`}
            className="inline-flex items-center gap-1 text-xs hover:underline w-fit"
            style={{ color: palette?.accent ?? 'hsl(var(--accent-blue))' }}
          >
            <Icon name="open_in_new" size={12} />
            {t('projectView.forkedFrom')}
            {project.forkedFrom.accountName ? ` @${project.forkedFrom.accountName}` : ''}
          </Link>
        )}

        {/* Description */}
        {description && (
          <div
            className="rounded-xl p-3"
            style={{
              background: palette ? `${palette.fg}08` : 'hsl(var(--card) / 0.4)',
              border: `1px solid ${borderColor}`,
            }}
          >
            <p
              className={`text-xs leading-relaxed whitespace-pre-wrap ${!descExpanded && isLongDescription ? 'line-clamp-4' : ''}`}
              style={{ color: palette?.nearer ?? 'hsl(var(--muted-foreground))' }}
            >
              {description}
            </p>
            {isLongDescription && (
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="text-xs mt-1 hover:underline"
                style={{ color: palette?.accent ?? 'hsl(var(--primary))' }}
              >
                {descExpanded ? t('projectView.showLess') : t('projectView.showMore')}
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {meta.tags && meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {meta.tags.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  background: palette ? `${palette.fg}12` : 'hsl(var(--muted))',
                  color: palette?.nearer ?? 'hsl(var(--muted-foreground))',
                  border: `1px solid ${borderColor}`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Author + date */}
        <div
          className="flex items-center gap-3 flex-wrap text-[11px]"
          style={{ color: palette?.faded ?? 'hsl(var(--muted-foreground))' }}
        >
          {accountName && (
            <div className="flex items-center gap-1.5">
              <Icon name="music_note" size={12} />
              <Link
                to={`/${accountName}`}
                className="hover:underline"
                style={{ color: palette?.nearer ?? 'hsl(var(--foreground))' }}
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

      </div>
    </div>
  );
}
