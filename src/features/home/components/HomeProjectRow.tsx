import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArtistText } from '@/features/artists/ArtistText';
import type { CardProject } from '@/features/library/components/ProjectCard';
import { ProjectCardMenu, ProjectCardMenuButton } from '@/features/projects/components/ProjectCardMenu';
import { ProjectListCover } from '@/features/projects/components/ProjectListCover';
import { projectEditPath } from '@/features/projects/project-path';
import { projectEditedAt } from '@/features/projects/project-edited-at';
import { projectProgress, projectStatus } from '@/features/projects/project-status';
import useConfirm from '@/shared/hooks/useConfirm';
import { Icon } from '@/shared/ui/Icon';
import { LogoLoader } from '@ui/LogoLoader';
import { getRelativeTime } from '@/shared/utils/date';

type HomeProjectRowProps = {
  project: CardProject;
  ownerAccountName?: string | null;
  onSelect: (publicId: string, editPath: string | null) => void;
  onEdit: (project: CardProject) => void;
  onDelete: (publicId: string) => void;
  isDeleting?: boolean;
  locale: string;
  timezone: string;
};

/**
 * Phone-width stand-in for ProjectCard: a 60px row (cover, title, artist and edit time, thin
 * progress bar, percent or check). The row body opens the editor; the 44px menu button next
 * to it carries the same items as the card's menu, and long-press opens the same menu.
 * Home only lists the signed-in user's own projects, so the owner is always the viewer.
 */
function HomeProjectRowBase({ project, ownerAccountName, onSelect, onEdit, onDelete, isDeleting = false, locale, timezone }: HomeProjectRowProps) {
  const { t } = useTranslation();
  const [requestConfirm, confirmModal] = useConfirm();
  const title = project.title || project.upload?.fileName || t('library.untitled');
  const pct = projectProgress(project);
  const complete = projectStatus(project) === 'completed';
  const source = project.upload?.source;

  const confirmDelete = () => {
    requestConfirm(
      t('confirm.deleteProject', { title }),
      () => onDelete(project.publicId),
      { title: t('confirm.deleteProjectTitle'), variant: 'danger' },
    );
  };

  return (
    <>
      <ProjectCardMenu
        project={project}
        isOwner
        ownerAccountName={ownerAccountName}
        onEdit={() => onEdit(project)}
        onDelete={confirmDelete}
      >
        <li
          aria-busy={isDeleting}
          className={`flex items-center rounded-[calc(var(--radius)*1.4)] transition-colors hover:bg-raised ${isDeleting ? 'opacity-50' : ''}`}
        >
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onSelect(project.publicId, projectEditPath(project, ownerAccountName))}
            className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 rounded-[calc(var(--radius)*1.4)] px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-focus"
          >
            <ProjectListCover coverImage={project.coverImage} genre={project.metadata?.genre} className="size-11" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-base font-semibold text-foreground">{title}</span>
                {source === 'youtube' && (
                  <span role="img" aria-label={t('home.sourceYoutube')} className="shrink-0 text-love"><Icon name="play_circle" size={14} /></span>
                )}
                {source === 'cloudinary' && (
                  <span role="img" aria-label={t('home.sourceCloud')} className="shrink-0 text-foam"><Icon name="cloud" size={14} /></span>
                )}
                {project.public && (
                  <span role="img" aria-label={t('home.viewPublic')} className="shrink-0 text-subtle"><Icon name="visibility" size={14} /></span>
                )}
              </span>
              <span className="truncate text-xs text-subtle">
                <ArtistText metadata={project.metadata} fallback={t('home.noArtist')} />
                {' · '}
                {getRelativeTime(projectEditedAt(project), t, timezone, locale)}
              </span>
              <span className="mt-0.5 block h-[3px] overflow-hidden rounded-sm bg-hl" aria-hidden="true">
                <span className={`block h-full rounded-sm ${complete ? 'bg-foam' : 'bg-iris'}`} style={{ width: `${pct}%` }} />
              </span>
            </span>
            <span className="grid w-9 shrink-0 place-items-center">
              {isDeleting ? (
                <LogoLoader size={16} />
              ) : complete ? (
                <span role="img" aria-label={t('home.statusComplete')} className="text-foam"><Icon name="check" size={18} /></span>
              ) : (
                <span title={t('home.progressPct', { pct })} className="font-mono text-xs font-medium tabular-nums text-subtle">{pct}%</span>
              )}
            </span>
          </button>
          <ProjectCardMenuButton
            project={project}
            isOwner
            ownerAccountName={ownerAccountName}
            onEdit={() => onEdit(project)}
            onDelete={confirmDelete}
            className="grid size-11 shrink-0 place-items-center rounded-[calc(var(--radius)*1.4)] text-subtle transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-focus"
          />
        </li>
      </ProjectCardMenu>
      {confirmModal}
    </>
  );
}

export const HomeProjectRow = memo(HomeProjectRowBase);
