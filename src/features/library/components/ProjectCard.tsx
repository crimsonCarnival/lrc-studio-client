import { useRef, useCallback, memo } from 'react';
import type { TouchEvent, MouseEvent, KeyboardEvent } from 'react';
import useHapticFeedback from '@/shared/hooks/useHapticFeedback';
import { Icon } from '@/shared/ui/Icon';
import { ProjectListCover } from '@/features/projects/components/ProjectListCover';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { useTranslation } from 'react-i18next';
import useConfirm from '@/shared/hooks/useConfirm';
import { formatInTimezone, getRelativeTime } from '@/shared/utils/date';
import { LogoLoader } from '@ui/LogoLoader';
import { ProjectMenu, ProjectMenuButton } from '@/features/projects/components/ProjectMenu';
import { ProjectStatusTag } from '@/features/projects/components/ProjectStatusTag';
import { projectStatus } from '@/features/projects/project-status';
import { projectPath, projectEditPath } from '@/features/projects/project-path';

const SWIPE_THRESHOLD = 60;

export interface CardProject {
  publicId: string;
  slug?: string | null;
  title?: string;
  coverImage?: string;
  editorMode?: string;
  lineCount?: number;
  syncedLineCount?: number;
  starCount?: number;
  forkCount?: number;
  viewCount?: number;
  shareCount?: number;
  public?: boolean;
  createdAt?: string | number;
  updatedAt?: string | number;
  metadata?: { genre?: string; songArtist?: string };
  forkedFrom?: { publicId?: string; accountName?: string };
  user?: { accountName?: string | null } | null;
  upload?: { fileName?: string; duration?: number; source?: string };
  [key: string]: unknown;
}

interface I18nLike {
  resolvedLanguage?: string;
  language?: string;
}

interface ProjectCardProps {
  project: CardProject;
  onDelete?: (publicId: string) => void;
  onFavorite?: (publicId: string) => void;
  /**
   * `editPath` is the canonical editor URL, or null when the owner's account
   * name is unknown here — the caller must not rebuild a path from publicId.
   */
  onSelect?: (publicId: string, editPath: string | null) => void;
  onEdit?: (project: CardProject) => void;
  isListView?: boolean;
  isDeleting?: boolean;
  i18n?: I18nLike;
  timezone?: string;
  /**
   * Fails closed: defaults to false so a future call site that forgets to pass
   * this never gets an edit link on a project it doesn't own. Every current
   * owner surface (Library, the mobile ProjectList) passes it explicitly.
   */
  isOwner?: boolean;
  /** The owner's account name; the canonical project URL is owner-scoped. */
  ownerAccountName?: string | null;
}

function ProjectCard({
  project,
  onDelete,
  onFavorite,
  onSelect,
  onEdit,
  isListView = false,
  isDeleting = false,
  i18n,
  timezone,
  isOwner = false,
  ownerAccountName
}: ProjectCardProps) {
  const { t } = useTranslation();
  const { trigger: haptic } = useHapticFeedback();
  const [requestConfirm, confirmModal] = useConfirm();
  const cardRef = useRef<HTMLDivElement>(null);
  const touchState = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    isSwiping: false
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      isSwiping: false
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchState.current.startX);
    const deltaY = Math.abs(touch.clientY - touchState.current.startY);

    // Only consider it a swipe if horizontal movement > vertical movement
    if (deltaX > 10 && deltaX > deltaY) {
      touchState.current.isSwiping = true;
      touchState.current.currentX = touch.clientX;
    }
  }, []);

  const handleSwipeDelete = useCallback(() => {
    if (!onDelete) return;
    requestConfirm(
      t('confirm.deleteProject', { title: project.title || t('library.untitled') }),
      () => {
        onDelete(project.publicId);
      },
      { title: t('confirm.deleteProjectTitle'), variant: 'danger' }
    );
  }, [project, onDelete, requestConfirm, t]);

  const handleSwipeFavorite = useCallback(() => {
    if (!onFavorite) return;
    onFavorite(project.publicId);
  }, [project, onFavorite]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.changedTouches.length === 0) return;
    if (!touchState.current.isSwiping) return;

    const touch = e.changedTouches[0];
    const deltaX = touchState.current.startX - touch.clientX;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      // Fire haptic at swipe completion for better feedback timing
      haptic('medium');

      if (deltaX > 0) {
        // Swipe left: delete
        handleSwipeDelete();
      } else {
        // Swipe right: favorite
        handleSwipeFavorite();
      }
    }

    touchState.current.isSwiping = false;
  }, [haptic, handleSwipeDelete, handleSwipeFavorite]);

  const handleDelete = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    handleSwipeDelete();
  }, [handleSwipeDelete]);

  const handleEdit = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    onEdit?.(project);
  }, [project, onEdit]);

  // Null when the owner's account name is unknown here: every project URL is
  // owner-scoped, so there is nothing to navigate or link to without it.
  const editPath = projectEditPath(project, ownerAccountName);
  const viewPath = projectPath(project, ownerAccountName);

  const openProject = useCallback(() => {
    if (!touchState.current.isSwiping) {
      onSelect?.(project.publicId, editPath);
    }
  }, [project.publicId, editPath, onSelect]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(project.publicId, editPath);
    }
  }, [project.publicId, editPath, onSelect]);

  // List view: full-width row layout
  if (isListView) {
    return (
      <>
        <ProjectMenu
          project={project}
          isOwner={isOwner}
          ownerAccountName={ownerAccountName}
          onEdit={onEdit ? () => onEdit(project) : undefined}
          onDelete={onDelete ? handleSwipeDelete : undefined}
        >
        <div
          ref={cardRef}
          role="button"
          tabIndex={0}
          aria-label={project.title || project.upload?.fileName || t('library.untitled')}
          onClick={openProject}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full group flex items-start gap-3 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-700/40 hover:border-zinc-600/60 transition-all duration-150 text-left cursor-pointer"
        >
          {/* Cover or genre placeholder */}
          <ProjectListCover
            coverImage={project.coverImage}
            genre={project.metadata?.genre}
            className="size-9 mt-0.5"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100 truncate">
                {project.title || project.upload?.fileName || t('library.untitled')}
              </span>
              <span className="text-[10px] font-bold uppercase text-zinc-500 bg-zinc-700/50 px-1.5 py-0.5 rounded flex-shrink-0">
                {project.editorMode}
              </span>
              {project.forkedFrom?.publicId && (
                <Tip content={project.forkedFrom.accountName ? t('share.forkedFrom', { accountName: project.forkedFrom.accountName }) : t('share.forkedProject')}>
                  <span className="text-[10px] font-bold uppercase text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-1">
                    <Icon name="open_in_new" size={10} />
                    {t('share.forkedBadge')}
                  </span>
                </Tip>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Icon name="description" size={12} />
                {t('library.lines', { count: project.lineCount || 0 })}
              </span>
              {project.upload?.duration && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Icon name="schedule" size={12} />
                  {Math.floor(project.upload.duration / 60)}:{String(Math.floor(project.upload.duration % 60)).padStart(2, '0')}
                </span>
              )}
              {project.upload?.source === 'youtube' && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 180"><path fill="red" d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134Z"/><path fill="#FFF" d="m102.421 128.06 66.328-38.418-66.328-38.418z" className="size-3"/></svg>
                  {t('uploads.youtube')}
                </span>
              )}
              {(project.starCount ?? 0) > 0 && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Icon name="star" size={12} />
                  {project.starCount}
                </span>
              )}
              {(project.forkCount ?? 0) > 0 && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Icon name="call_split" size={12} />
                  {project.forkCount}
                </span>
              )}
              {(project.viewCount ?? 0) > 0 && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Icon name="visibility" size={12} />
                  {project.viewCount}
                </span>
              )}
              {(project.shareCount ?? 0) > 0 && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Icon name="share" size={12} />
                  {project.shareCount}
                </span>
              )}
            </div>

            <Tip content={formatInTimezone(project.updatedAt, timezone, {
              dateStyle: 'full',
              timeStyle: 'long'
            }, i18n?.resolvedLanguage || i18n?.language)}>
              <span className="text-[10px] text-zinc-600 mt-1 block">
                {getRelativeTime(project.updatedAt, t, timezone, i18n?.resolvedLanguage || i18n?.language)}
              </span>
            </Tip>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tip content={t('project.editMetadata')}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEdit}
                  className="text-zinc-500 hover:text-primary hover:bg-primary/10 size-7"
                >
                  <Icon name="edit" size={14} />
                </Button>
              </Tip>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 size-7"
              >
                {isDeleting
                  ? <LogoLoader size={14} />
                  : <Icon name="delete" size={14} />}
              </Button>
            </div>
            <ProjectMenuButton
              project={project}
              isOwner={isOwner}
              ownerAccountName={ownerAccountName}
              onEdit={onEdit ? () => onEdit(project) : undefined}
              onDelete={onDelete ? handleSwipeDelete : undefined}
            />
          </div>
        </div>
        </ProjectMenu>
        {confirmModal}
      </>
    );
  }

  // Grid view: card layout (for desktop/grid view)
  const progress = project.lineCount ? Math.min(100, Math.round((((project.syncedLineCount as number) || 0) / (project.lineCount as number)) * 100)) : 0;

  return (
    <>
      <ProjectMenu
        project={project}
        isOwner={isOwner}
        ownerAccountName={ownerAccountName}
        onEdit={onEdit ? () => onEdit(project) : undefined}
        onDelete={onDelete ? handleSwipeDelete : undefined}
      >
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-label={project.title || project.upload?.fileName || t('library.untitled')}
        onClick={openProject}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[var(--radius-card)] bg-background text-left inset-ring inset-ring-hl transition-[translate,box-shadow] duration-200 ease-state hover:-translate-y-[3px] hover:inset-ring-faint hover:shadow-toast focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
      >
        {/* Cover: art (or a hatch placeholder), source pill, open-in-tab on hover */}
        <div className="cover-hatch relative h-[150px] shrink-0 overflow-hidden">
          <div className="absolute inset-0 grid place-items-center transition-transform duration-[400ms] ease-state group-hover:scale-[1.04]">
            {project.coverImage ? (
              <img src={project.coverImage} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="text-faint">
                <path d="M3 12h1 M7 9v6 M11 5v14 M15 8v8 M19 11v2" />
              </svg>
            )}
          </div>
          <div className="absolute top-3 left-3 z-10 flex h-[26px] items-center gap-1.5 rounded-full bg-glass px-2.5 font-mono text-[11px] font-semibold leading-none tracking-[0.08em] text-foreground uppercase backdrop-blur-md">
            {project.upload?.source === 'youtube' ? (
              <><Icon name="play_circle" size={12} className="text-love" />{t('home.sourceYoutube')}</>
            ) : project.upload?.source === 'cloudinary' ? (
              <><Icon name="cloud" size={12} className="text-foam" />{t('home.sourceCloud')}</>
            ) : (
              t('home.sourceFile')
            )}
          </div>
          {project.public && viewPath ? (
            <Tip content={t('home.viewPublic')}>
              <a
                href={viewPath}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('home.viewPublic')}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 z-10 grid size-9 place-items-center rounded-[10px] bg-glass text-foreground opacity-0 backdrop-blur-md transition-opacity duration-[var(--duration-state)] group-hover:opacity-100 focus-visible:opacity-100 coarse:opacity-100"
              >
                <Icon name="open_in_new" size={16} />
              </a>
            </Tip>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-3 py-4 pr-4 pb-[18px] pl-[18px]">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h3 className="truncate font-heading text-[19px] font-bold tracking-tight text-foreground">{project.title || project.upload?.fileName || t('library.untitled')}</h3>
              <span className="truncate text-[15px] text-subtle">{project.metadata?.songArtist || t('home.noArtist')}</span>
            </div>
            {/* Quick actions on hover; the menu button holds the same actions for touch and keyboard. */}
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 coarse:hidden">
              <Tip content={t('project.editMetadata')}>
                <Button variant="ghost" size="icon" onClick={handleEdit} aria-label={t('project.editMetadata')} className="size-9 lg:size-9">
                  <Icon name="edit" size={16} />
                </Button>
              </Tip>
              <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isDeleting} className="size-9 text-love-ink hover:bg-love-soft hover:text-love-ink lg:size-9">
                {isDeleting ? <LogoLoader size={14} /> : <Icon name="delete" size={16} />}
              </Button>
            </div>
            <ProjectMenuButton
              project={project}
              isOwner={isOwner}
              ownerAccountName={ownerAccountName}
              onEdit={onEdit ? () => onEdit(project) : undefined}
              onDelete={onDelete ? handleSwipeDelete : undefined}
              className="grid size-9 shrink-0 place-items-center rounded-[10px] text-subtle transition-colors hover:bg-raised hover:text-foreground"
            />
          </div>

          <div className="flex flex-col gap-[7px]">
            <div className="flex items-center justify-between gap-2">
              <ProjectStatusTag status={projectStatus(project)} />
              <Tip content={t('home.statLinesTip')}>
                <span className="cursor-default font-mono text-xs font-medium text-subtle">
                  {(project.syncedLineCount || 0)}/{(project.lineCount || 0)} {t('home.lines')}
                </span>
              </Tip>
            </div>
            <div className="h-1 overflow-hidden rounded-sm bg-hl">
              <div className={`h-full rounded-sm transition-[width] duration-500 ${progress === 100 ? 'bg-foam' : 'bg-iris'}`} style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs font-medium text-subtle">
            <Tip content={t('home.statStarsTip')}>
              <span className="flex cursor-default items-center gap-1"><Icon name="star" size={13} />{project.starCount ?? 0}</span>
            </Tip>
            <Tip content={t('home.statForksTip')}>
              <span className="flex cursor-default items-center gap-1"><Icon name="call_split" size={13} />{project.forkCount ?? 0}</span>
            </Tip>
            <Tip content={t('home.statViewsTip')}>
              <span className="flex cursor-default items-center gap-1"><Icon name="visibility" size={13} />{project.viewCount ?? 0}</span>
            </Tip>
            <Tip content={t('home.statSharesTip')}>
              <span className="flex cursor-default items-center gap-1"><Icon name="share" size={13} />{project.shareCount ?? 0}</span>
            </Tip>
            {/* Relative time on the card; the exact created/edited stamps move to the tooltip. */}
            <Tip
              content={
                <span className="flex flex-col gap-0.5">
                  <span>{t('home.created')} {formatInTimezone(project.createdAt, timezone, { dateStyle: 'short', timeStyle: 'short' }, (i18n?.resolvedLanguage || i18n?.language || 'en').slice(0, 2))}</span>
                  {(project.updatedAt && project.updatedAt !== project.createdAt) && (
                    <span>{t('home.edited')} {formatInTimezone(project.updatedAt, timezone, { dateStyle: 'short', timeStyle: 'short' }, (i18n?.resolvedLanguage || i18n?.language || 'en').slice(0, 2))}</span>
                  )}
                </span>
              }
            >
              <span className="ml-auto cursor-default">
                {getRelativeTime(project.updatedAt || project.createdAt, t, timezone, i18n?.resolvedLanguage || i18n?.language)}
              </span>
            </Tip>
          </div>
        </div>
      </div>
      </ProjectMenu>
      {confirmModal}
    </>
  );
}

export default memo(ProjectCard);
