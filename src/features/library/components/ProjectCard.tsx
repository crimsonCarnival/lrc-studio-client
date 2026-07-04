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

const SWIPE_THRESHOLD = 60;

export interface CardProject {
  publicId: string;
  title?: string;
  coverImage?: string;
  editorMode?: string;
  lineCount?: number;
  starCount?: number;
  forkCount?: number;
  updatedAt?: string | number;
  metadata?: { genre?: string };
  forkedFrom?: { publicId?: string; accountName?: string };
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
  onSelect?: (publicId: string) => void;
  onEdit?: (project: CardProject) => void;
  isListView?: boolean;
  isDeleting?: boolean;
  i18n?: I18nLike;
  timezone?: string;
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
  timezone
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

  const openProject = useCallback(() => {
    if (!touchState.current.isSwiping) {
      onSelect?.(project.publicId);
    }
  }, [project.publicId, onSelect]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(project.publicId);
    }
  }, [project.publicId, onSelect]);

  // List view: full-width row layout
  if (isListView) {
    return (
      <>
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
                <Tip content={project.forkedFrom.accountName ? t('share.forkedFrom', { username: project.forkedFrom.accountName, defaultValue: `Forked from {{username}}` }) : t('share.forkedProject')}>
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
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
                ? <Icon name="progress_activity" size={14} className="animate-spin" />
                : <Icon name="delete" size={14} />}
            </Button>
          </div>
        </div>
        {confirmModal}
      </>
    );
  }

  // Grid view: original card layout (for desktop)
  return (
    <>
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
        className="w-full group relative flex items-start gap-3 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-700/40 hover:border-zinc-600/60 transition-all duration-150 text-left cursor-pointer"
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
              <Tip content={project.forkedFrom.accountName ? t('share.forkedFrom', { username: project.forkedFrom.accountName, defaultValue: `Forked from {{username}}` }) : t('share.forkedProject')}>
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
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
              ? <Icon name="progress_activity" size={14} className="animate-spin" />
              : <Icon name="delete" size={14} />}
          </Button>
        </div>
      </div>
      {confirmModal}
    </>
  );
}

export default memo(ProjectCard);
