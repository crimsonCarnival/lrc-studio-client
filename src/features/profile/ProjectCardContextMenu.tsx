import { useTranslation } from 'react-i18next';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@ui/context-menu';
import { Pencil, Trash2, ExternalLink, Link2, Check } from 'lucide-react';
import { useState } from 'react';
import type { Project } from '@/types';

interface Props {
  children: React.ReactNode;
  project: Project;
  isOwner: boolean;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCardContextMenu({ children, project, isOwner, onEdit, onDelete }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const projectUrl = `${window.location.origin}/project/${project.publicId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(projectUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => window.open(`/project/${project.publicId}${isOwner ? '/edit' : ''}`, '_blank')}>
          <ExternalLink />
          {t('profile.openInNewTab', 'Open in new tab')}
        </ContextMenuItem>

        <ContextMenuItem onClick={handleCopyLink}>
          {copied ? <Check /> : <Link2 />}
          {copied ? t('projectView.actions.copied') : t('projectView.actions.copyLink')}
        </ContextMenuItem>

        {isOwner && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onEdit(project)}>
              <Pencil />
              {t('profile.editProject')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => onDelete(project)}>
              <Trash2 />
              {t('profile.deleteProject')}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
