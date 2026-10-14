import { ShareSheet } from '@/features/sharing/components/ShareSheet';
import { ogShareUrl } from '../og-url';
import { useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Popover, PopoverTrigger, PopoverContent, PopoverItem, PopoverSeparator } from '@ui/popover';
import { Button } from '@ui/button';
import { getPlaylists, addProjectToPlaylist, createPlaylist } from '@features/playlists/playlist.service';
import { projectsService } from '@features/projects/services/projects.service';
import { LogoLoader } from '@ui/LogoLoader';
import { downloadProjectExport } from './project-export';

interface Playlist {
  id: string;
  name: string;
}

interface Project {
  publicId?: string;
  title?: string;
  forksEnabled?: boolean;
  isForkedByMe?: boolean;
  coverImage?: string | null;
  metadata?: { songName?: string; songArtist?: string; genre?: string };
}

interface User {
  accountName?: string;
  isGuest?: boolean;
}

interface MenuItemProps {
  iconName?: string;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  children?: ReactNode;
}

// Expandable submenu item
function MenuItem({ iconName, label, onClick, danger, children }: MenuItemProps) {
  const [open, setOpen] = useState(false);
  const style: CSSProperties | undefined = danger ? { color: 'var(--color-red-400, #f87171)' } : undefined;

  if (children) {
    return (
      <div>
        <PopoverItem style={style} onClick={() => setOpen((v) => !v)} className="justify-between">
          <span className="flex items-center gap-2">
            {iconName && <Icon name={iconName} size={14} className="opacity-70" />}
            {label}
          </span>
          {open
            ? <Icon name="expand_more" size={12} className="opacity-50" />
            : <Icon name="chevron_right" size={12} className="opacity-50" />}
        </PopoverItem>
        {open && (
          <div className="ml-3 pl-2.5 border-l border-zinc-700/50 mt-0.5 mb-0.5">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <PopoverItem style={style} onClick={onClick}>
      {iconName && <Icon name={iconName} size={14} className="opacity-70" />}
      {label}
    </PopoverItem>
  );
}

// Lazy playlist picker — fetches on first open via click handler (no effect needed)
function AddToListMenu({ user, project, t }: { user: User; project: Project; t: TFunction }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const fetchPlaylists = () => {
    if (!user?.accountName || playlists !== null) return;
    setLoading(true);
    getPlaylists(user.accountName)
      .then((pl) => setPlaylists(pl))
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
  };

  const handleToggle = () => {
    if (!open) fetchPlaylists();
    setOpen((v) => !v);
  };

  const handleAdd = async (playlistId: string) => {
    if (added[playlistId] || !project.publicId) return;
    try {
      await addProjectToPlaylist(playlistId, project.publicId);
      setAdded((prev) => ({ ...prev, [playlistId]: true }));
    } catch { /* no-op */ }
  };

  const handleNewPlaylist = async () => {
    try {
      const pl = await createPlaylist({
        name: t('projectView.actions.newPlaylist'),
        isPublic: false,
      });
      if (pl?.id && project.publicId) {
        await addProjectToPlaylist(pl.id, project.publicId);
        setPlaylists((prev) => [...(prev ?? []), pl]);
        setAdded((prev) => ({ ...prev, [pl.id]: true }));
      }
    } catch { /* no-op */ }
  };

  return (
    <div>
      <PopoverItem onClick={handleToggle} className="justify-between">
        <span className="flex items-center gap-2">
          <Icon name="playlist_add" size={14} className="opacity-70" />
          {t('projectView.actions.addToList')}
        </span>
        {open
          ? <Icon name="expand_more" size={12} className="opacity-50" />
          : <Icon name="chevron_right" size={12} className="opacity-50" />}
      </PopoverItem>

      {open && (
        <div className="ml-3 pl-2.5 border-l border-zinc-700/50 mt-0.5 mb-0.5">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500">
              <LogoLoader size={12} />
              {t('projectView.actions.loadingLists')}
            </div>
          )}

          {!loading && playlists?.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-zinc-500 italic">
              {t('projectView.actions.noLists')}
            </p>
          )}

          {playlists?.map((pl) => (
            <PopoverItem
              key={pl.id}
              onClick={() => handleAdd(pl.id)}
              className="justify-between"
            >
              <span className="truncate max-w-[130px]">{pl.name}</span>
              {added[pl.id] && <Icon name="check" size={12} className="text-primary shrink-0" />}
            </PopoverItem>
          ))}

          <PopoverSeparator />
          <PopoverItem onClick={handleNewPlaylist}>
            <Icon name="add" size={14} className="opacity-70" />
            {t('projectView.actions.newList')}
          </PopoverItem>
        </div>
      )}
    </div>
  );
}

interface ProjectActionsMenuProps {
  project: Project;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lines: any[];
  isOwner: boolean;
  user?: User | null;
  onEdit?: () => void;
  onFork?: () => void;
  /** Sizing/shape of the trigger; the two page layouts place it differently. */
  triggerClassName?: string;
}

export function ProjectActionsMenu({
  project,
  lines,
  isOwner,
  user,
  onEdit,
  onFork,
  triggerClassName = 'size-8 rounded-full shrink-0',
}: ProjectActionsMenuProps) {
  const { t } = useTranslation();
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch { /* no-op */ }
    setLinkCopied(true);
    if (project?.publicId) {
      projectsService.incrementShare(project.publicId).catch(() => {});
    }
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // The share link opens the share sheet; the popover closes first so the dialog owns focus.
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const canFork = project?.forksEnabled !== false && !project?.isForkedByMe;

  return (
    <>
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={triggerClassName}
          aria-label={t('projectView.actions.menu')}
        >
          <Icon name="more_horiz" size={16} />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-52">

        {/* Owner: edit */}
        {isOwner && (
          <>
            <MenuItem iconName="edit" label={t('projectView.editButton')} onClick={onEdit} />
            <PopoverSeparator />
          </>
        )}

        {/* Non-owner: fork */}
        {!isOwner && canFork && (
          <>
            <MenuItem iconName="call_split" label={t('projectView.forkButton')} onClick={onFork} />
          </>
        )}

        {/* Logged-in non-owner: add to playlist */}
        {!isOwner && user && !user.isGuest && (
          <>
            <AddToListMenu user={user} project={project} t={t} />
            <PopoverSeparator />
          </>
        )}

        {/* Export — all users */}
        <MenuItem iconName="download" label={t('projectView.actions.export')}>
          <MenuItem iconName="description" label="LRC (.lrc)" onClick={() => downloadProjectExport('lrc', project, lines ?? [])} />
          <MenuItem iconName="code" label="SRT (.srt)" onClick={() => downloadProjectExport('srt', project, lines ?? [])} />
        </MenuItem>

        {/* Share — all users */}
        <MenuItem iconName="share" label={t('projectView.actions.share')}>
          <MenuItem
            iconName="share"
            label={t('projectView.actions.shareOg')}
            onClick={() => { setMenuOpen(false); setShareOpen(true); }}
          />
          <MenuItem
            iconName={linkCopied ? 'check' : 'link'}
            label={linkCopied ? t('projectView.actions.copied') : t('projectView.actions.copyLink')}
            onClick={handleCopyLink}
          />
        </MenuItem>

      </PopoverContent>
    </Popover>
    {project?.publicId && (
      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={ogShareUrl(project.publicId)}
        title={project.metadata?.songName || project.title || 'LRC Studio'}
        subtitle={project.metadata?.songArtist}
        projectName={project.title}
        coverImage={project.coverImage}
        genre={project.metadata?.genre}
        onShared={() => { projectsService.incrementShare(project.publicId!).catch(() => {}); }}
      />
    )}
    </>
  );
}
