import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
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

interface MetaProject {
  title?: string;
  createdAt?: string | number | Date;
  metadata?: ProjectMeta;
  starCount?: number;
  forkCount?: number;
  user?: { accountName?: string; displayName?: string };
  forkedFrom?: { publicId?: string; accountName?: string };
}

interface ProjectMetaBlockProps {
  project: MetaProject;
  cover?: string | null;
  ctaSlot?: ReactNode;
  starCount?: number;
  reactionsSlot?: ReactNode;
}

export default function ProjectMetaBlock({ project, cover, ctaSlot, starCount, reactionsSlot }: ProjectMetaBlockProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const [descExpanded, setDescExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const formattedDate = project.createdAt
    ? formatInTimezone(project.createdAt, settings.advanced?.timezone, {
        year: 'numeric', month: 'short', day: 'numeric',
      }, i18n.resolvedLanguage || i18n.language)
    : null;

  const meta = project.metadata || {};
  const description = meta.description || '';
  const isLongDescription = description.length > 220;
  const accountName = project.user?.accountName;

  return (
    <div className="flex flex-col gap-3 pt-4">
      {/* Title row — always visible */}
      <div className="flex items-start gap-3">
        {cover && (
          <img
            src={cover}
            alt=""
            className="size-12 rounded-lg object-cover border border-border flex-shrink-0"
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-tight">
            {project.title || t('projectView.notFound')}
          </h1>
          {(meta.songName || meta.songArtist) && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              {meta.songName && <span className="font-medium text-foreground/90">{meta.songName}</span>}
              {meta.songArtist && <span className="before:content-['·'] before:mr-1.5">{meta.songArtist}</span>}
              {meta.songAlbum && <span className="before:content-['·'] before:mr-1.5 italic">{meta.songAlbum}</span>}
              {meta.songYear && <span className="before:content-['·'] before:mr-1.5">{meta.songYear}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {ctaSlot}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={collapsed ? t('projectView.showMore') : t('projectView.showLess')}
          >
            {collapsed ? <Icon name="expand_more" size={16} /> : <Icon name="expand_less" size={16} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Stats + reactions */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Icon name="star" size={14} />{starCount ?? project.starCount ?? 0}</span>
              <span className="inline-flex items-center gap-1"><Icon name="call_split" size={14} />{project.forkCount ?? 0}</span>
            </div>
            {reactionsSlot}
          </div>

          {/* Forked-from */}
          {project.forkedFrom?.publicId && (
            <Link
              to={`/project/${project.forkedFrom.publicId}`}
              className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline w-fit"
            >
              <Icon name="open_in_new" size={12} />
              {t('projectView.forkedFrom')}
              {project.forkedFrom.accountName ? ` @${project.forkedFrom.accountName}` : ''}
            </Link>
          )}

          {/* Description */}
          {description && (
            <div className="flex flex-col gap-1 rounded-xl bg-card/40 border border-border p-3">
              <p className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap ${(!descExpanded && isLongDescription) ? 'line-clamp-4' : ''}`}>
                {description}
              </p>
              {isLongDescription && (
                <button onClick={() => setDescExpanded((v) => !v)} className="text-xs text-primary hover:underline w-fit">
                  {descExpanded ? t('projectView.showLess') : t('projectView.showMore')}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          {meta.tags && meta.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {meta.tags.map((tag, i) => (
                <span key={`${tag}-${i}`} className="px-2 py-0.5 rounded-md bg-muted border border-border text-[11px] text-muted-foreground font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Author + date */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            {accountName && (
              <div className="flex items-center gap-1.5">
                <Icon name="music_note" size={14} />
                <Link to={`/${accountName}`} className="text-foreground hover:text-primary transition-colors">
                  {project.user?.displayName || `@${accountName}`}
                </Link>
              </div>
            )}
            {formattedDate && (
              <div className="flex items-center gap-1.5">
                <Icon name="calendar_month" size={14} />
                <span>{t('projectView.publishedOn')} {formattedDate}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
