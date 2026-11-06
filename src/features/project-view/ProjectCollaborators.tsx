import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { profilePath } from '@/features/profile/profile-path';
import { projectsService } from '@features/projects/services/projects.service';
import useConfirm from '@/shared/hooks/useConfirm';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { Icon } from '@/shared/ui/Icon';
import { UserHoverCard } from '@ui/UserHoverCard';
import type { ProjectCollaborator } from '@/types/graphql';
import { Tip } from '@ui/tip';

interface ProjectCollaboratorsProps {
  publicId: string;
  collaborators: ProjectCollaborator[];
  isOwner: boolean;
}

function Avatar({ name, handle, url }: { name: string; handle?: string | null; url?: string | null }) {
  return url ? (
    <img src={url} alt="" className="size-[22px] shrink-0 rounded-full object-cover" loading="lazy" decoding="async" />
  ) : (
    <InitialsAvatar name={name} handle={handle} className="size-[22px] shrink-0 rounded-full text-[10px]" />
  );
}

/**
 * The "Synced with" row of the info panel: who else edited the project in a live session.
 * Renders a `<dl>` row (label + value), so it must sit inside the panel's facts list, and
 * nothing at all when no one is credited. Removal is owner-only in the UI; the server
 * re-checks ownership. Keyed by project by the caller, so the removed set never leaks across.
 */
export function ProjectCollaborators({ publicId, collaborators, isOwner }: ProjectCollaboratorsProps) {
  const { t } = useTranslation();
  const [requestConfirm, confirmModal] = useConfirm();
  const [removed, setRemoved] = useState<string[]>([]);
  const visible = collaborators.filter((c) => !removed.includes(c.id));
  if (visible.length === 0) return null;

  const remove = async (c: ProjectCollaborator) => {
    try {
      await projectsService.removeCollaborator(publicId, c.id);
    } catch (err) {
      // not_found: the credit (or project) is already gone, which is the state we wanted.
      if ((err as { code?: string }).code !== 'not_found') {
        toast.error(t('projectView.collaborators.removeFailed'));
        return;
      }
    }
    setRemoved((prev) => [...prev, c.id]);
  };

  return (
    <div className="contents">
      <dt className="text-subtle">{t('projectView.syncedWith')}</dt>
      <dd className="min-w-0 text-foreground">
        <ul className="flex flex-col gap-1.5">
          {visible.map((c) => {
            const accountName = !c.isGuest ? c.user?.accountName : null;
            const name = c.user?.displayName || c.name;
            return (
              <li key={c.id} className="flex min-w-0 items-center gap-2">
                {accountName ? (
                  <UserHoverCard accountName={accountName}>
                    <Link to={profilePath(accountName)} className="flex min-w-0 items-center gap-2 hover:underline">
                      <Avatar name={name} handle={accountName} url={c.user?.avatarUrl} />
                      <span className="truncate font-bold text-foreground">{name}</span>
                    </Link>
                  </UserHoverCard>
                ) : (
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={c.name} />
                    <span className="truncate font-bold text-foreground">{c.name}</span>
                    {c.isGuest && (
                      <span className="inline-flex h-5 shrink-0 items-center rounded-pill bg-raised px-[7px] text-[11px] font-semibold text-subtle">
                        {t('projectView.collaborators.guest')}
                      </span>
                    )}
                  </span>
                )}
                {isOwner && (
                  <Tip content={t('projectView.collaborators.remove', { name })}>
                    <button
                      type="button"
                      aria-label={t('projectView.collaborators.remove', { name })}
                      onClick={() => requestConfirm(
                        t('projectView.collaborators.confirmMessage', { name }),
                        () => { void remove(c); },
                        { title: t('projectView.collaborators.confirmTitle'), variant: 'danger' },
                      )}
                      className="ml-auto grid size-6 coarse:size-9 shrink-0 place-items-center rounded-full text-subtle transition-colors hover:bg-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </Tip>
                )}
              </li>
            );
          })}
        </ul>
        {confirmModal}
      </dd>
    </div>
  );
}
