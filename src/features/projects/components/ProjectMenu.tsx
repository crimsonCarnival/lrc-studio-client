import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent } from '@ui/context-menu';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@ui/dropdown-menu';
import { contextMenuComponents, dropdownMenuComponents, type MenuComponents } from '@ui/menu-components';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';

/**
 * Only `publicId` is read here, so the shape is widened rather than tied to the
 * full `Project` type — Explore has its own `ExploreProject` and Library has
 * `CardProject`, and all three should satisfy this without a cast.
 */
export type ProjectMenuProject = { publicId: string } & Record<string, unknown>;

export type ProjectMenuActions = {
  project: ProjectMenuProject;
  isOwner: boolean;
  /** Optional: Search and Explore render other people's projects and pass neither. */
  onEdit?: (project: ProjectMenuProject) => void;
  onDelete?: (project: ProjectMenuProject) => void;
};

/**
 * The project menu's items, written once and rendered through either the
 * ContextMenu or the DropdownMenu component set. Adding an action means editing
 * this one function, so right-click and the ⋮ button cannot diverge.
 */
function useProjectMenuItems({ project, isOwner, onEdit, onDelete }: ProjectMenuActions) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const projectUrl = `${window.location.origin}/project/${project.publicId}`;
    navigator.clipboard.writeText(projectUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (C: MenuComponents): ReactNode => (
    <>
      <C.Item onClick={() => window.open(`/project/${project.publicId}`, '_blank')}>
        <Icon name="open_in_new" />
        {t('profile.openInNewTab')}
      </C.Item>

      <C.Item onClick={handleCopyLink}>
        {copied ? <Icon name="check" /> : <Icon name="link" />}
        {copied ? t('projectView.actions.copied') : t('projectView.actions.copyLink')}
      </C.Item>

      {isOwner && onEdit && (
        <>
          <C.Separator />
          <C.Item onClick={() => onEdit(project)}>
            <Icon name="edit" />
            {t('profile.editProject')}
          </C.Item>
        </>
      )}

      {isOwner && onDelete && (
        <>
          <C.Separator />
          <C.Item variant="destructive" onClick={() => onDelete(project)}>
            <Icon name="delete" />
            {t('profile.deleteProject')}
          </C.Item>
        </>
      )}
    </>
  );
}

/** Right-click trigger. `children` must be a SINGLE element — asChild forwards a ref to it. */
export function ProjectMenu({ children, ...actions }: ProjectMenuActions & { children: ReactNode }) {
  const renderItems = useProjectMenuItems(actions);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>{renderItems(contextMenuComponents)}</ContextMenuContent>
    </ContextMenu>
  );
}

/** Visible ⋮ trigger — the touch- and keyboard-reachable path to the same items. */
export function ProjectMenuButton({ className, ...actions }: ProjectMenuActions & { className?: string }) {
  const { t } = useTranslation();
  const renderItems = useProjectMenuItems(actions);
  return (
    <DropdownMenu>
      <Tip content={t('common.moreActions')}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('common.moreActions')}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            // Radix's DropdownMenuTrigger onKeyDown calls preventDefault() for
            // Enter/Space/ArrowDown but never stopPropagation(), so the keydown
            // still bubbles to the card root's own onKeyDown (which fires on
            // exactly those keys and navigates). Stop it here — propagation
            // only, never preventDefault, or Radix's own menu-open handling
            // (composed via composeEventHandlers with checkForDefaultPrevented)
            // gets suppressed and the button stops working entirely.
            onKeyDown={(e) => { if (['Enter', ' ', 'ArrowDown'].includes(e.key)) e.stopPropagation(); }}
            className={className ?? 'p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 transition-colors'}
          >
            <Icon name="more_vert" size={16} />
          </button>
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end">{renderItems(dropdownMenuComponents)}</DropdownMenuContent>
    </DropdownMenu>
  );
}
