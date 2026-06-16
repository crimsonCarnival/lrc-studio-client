import { useRef, useCallback, memo } from 'react';
import useHapticFeedback from '@/shared/hooks/useHapticFeedback';
import { FileText, Trash2, ExternalLink, Clock, Pencil, Loader2, Star, GitFork, Video } from 'lucide-react';
import { ProjectListCover } from '@/features/projects/components/ProjectListCover';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { useTranslation } from 'react-i18next';
import useConfirm from '@/shared/hooks/useConfirm';
import { formatInTimezone, getRelativeTime } from '@/shared/utils/date';

const SWIPE_THRESHOLD = 60;

/**
 * ProjectCard component for displaying a project
 * Supports both grid view (desktop) and list view (mobile) with swipe gestures
 *
 * @param {Object} project - Project data object
 * @param {Function} onDelete - Callback when delete is triggered
 * @param {Function} onFavorite - Callback when favorite is triggered
 * @param {Function} onSelect - Callback when project is selected
 * @param {Function} onEdit - Callback when edit button is clicked
 * @param {Boolean} isListView - If true, renders as list item; if false, renders as grid card
 * @param {Boolean} isDeleting - If true, shows loading state for delete action
 * @param {Object} i18n - Internationalization object
 * @param {String} timezone - Timezone for date formatting
 */
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
}) {
  const { t } = useTranslation();
  const { trigger: haptic } = useHapticFeedback();
  const [requestConfirm, confirmModal] = useConfirm();
  const cardRef = useRef(null);
  const touchState = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    isSwiping: false
  });

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      isSwiping: false
    };
  }, []);

  const handleTouchMove = useCallback((e) => {
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
        onDelete(project.projectId);
      },
      { title: t('confirm.deleteProjectTitle'), variant: 'danger' }
    );
  }, [project, onDelete, requestConfirm, t]);

  const handleSwipeFavorite = useCallback(() => {
    if (!onFavorite) return;
    onFavorite(project.projectId);
  }, [project, onFavorite]);

  const handleTouchEnd = useCallback((e) => {
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

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    handleSwipeDelete();
  }, [handleSwipeDelete]);

  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    onEdit?.(project);
  }, [project, onEdit]);

  const openProject = useCallback(() => {
    if (!touchState.current.isSwiping) {
      onSelect?.(project.projectId);
    }
  }, [project.projectId, onSelect]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(project.projectId);
    }
  }, [project.projectId, onSelect]);

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
              {project.forkedFrom?.projectId && (
                <Tip content={project.forkedFrom.accountName ? t('share.forkedFrom', { username: project.forkedFrom.accountName, defaultValue: `Forked from {{username}}` }) : t('share.forkedProject')}>
                  <span className="text-[10px] font-bold uppercase text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-1">
                    <ExternalLink className="size-2.5" />
                    {t('share.forkedBadge')}
                  </span>
                </Tip>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <FileText className="size-3" />
                {t('library.lines', { count: project.lineCount || 0 })}
              </span>
              {project.upload?.duration && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Clock className="size-3" />
                  {Math.floor(project.upload.duration / 60)}:{String(Math.floor(project.upload.duration % 60)).padStart(2, '0')}
                </span>
              )}
              {project.upload?.source === 'youtube' && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Video className="size-3" />
                  {t('uploads.youtube')}
                </span>
              )}
              {project.starCount > 0 && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Star className="size-3" />
                  {project.starCount}
                </span>
              )}
              {project.forkCount > 0 && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <GitFork className="size-3" />
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
                <Pencil className="size-3.5" />
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
                ? <Loader2 className="size-3.5 animate-spin" />
                : <Trash2 className="size-3.5" />}
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
            {project.forkedFrom?.projectId && (
              <Tip content={project.forkedFrom.accountName ? t('share.forkedFrom', { username: project.forkedFrom.accountName, defaultValue: `Forked from {{username}}` }) : t('share.forkedProject')}>
                <span className="text-[10px] font-bold uppercase text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-1">
                  <ExternalLink className="size-2.5" />
                  {t('share.forkedBadge')}
                </span>
              </Tip>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <FileText className="size-3" />
              {t('library.lines', { count: project.lineCount || 0 })}
            </span>
            {project.upload?.duration && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="size-3" />
                {Math.floor(project.upload.duration / 60)}:{String(Math.floor(project.upload.duration % 60)).padStart(2, '0')}
              </span>
            )}
            {project.upload?.source === 'youtube' && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Video className="size-3" />
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
              <Pencil className="size-3.5" />
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
              ? <Loader2 className="size-3.5 animate-spin" />
              : <Trash2 className="size-3.5" />}
          </Button>
        </div>
      </div>
      {confirmModal}
    </>
  );
}

export default memo(ProjectCard);
