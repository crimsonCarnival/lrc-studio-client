// client/src/features/projects/components/ProjectMetaBlock.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Music2, GitFork, Star, ExternalLink } from 'lucide-react';

export default function ProjectMetaBlock({ project, cover, ctaSlot }) {
  const { t } = useTranslation();
  const [descExpanded, setDescExpanded] = useState(false);

  const meta = project.metadata || {};
  const description = meta.description || '';
  const isLongDescription = description.length > 220;
  const accountName = project.user?.accountName;

  return (
    <div className="flex flex-col gap-4 pt-4">
      {/* Title row */}
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
        {ctaSlot}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Star className="size-3.5" />{project.starCount ?? 0}</span>
        <span className="inline-flex items-center gap-1"><GitFork className="size-3.5" />{project.forkCount ?? 0}</span>
      </div>

      {/* Forked-from */}
      {project.forkedFrom?.projectId && (
        <Link
          to={`/project/${project.forkedFrom.projectId}`}
          className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline w-fit"
        >
          <ExternalLink className="size-3" />
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
      {meta.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {meta.tags.map((tag, i) => (
            <span key={`${tag}-${i}`} className="px-2 py-0.5 rounded-md bg-muted border border-border text-[11px] text-muted-foreground font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Author */}
      {accountName && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Music2 className="size-3.5" />
          <Link to={`/${accountName}`} className="text-foreground hover:text-primary transition-colors">
            {project.user.displayName || `@${accountName}`}
          </Link>
        </div>
      )}
    </div>
  );
}
