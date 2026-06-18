import { useState } from 'react';
import type { ComponentType, ReactNode, CSSProperties } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  MoreHorizontal, Pencil, GitFork,
  Download, Share2, Link2, Check,
  ChevronRight, ChevronDown, FileText, FileCode,
  ListPlus, Loader2, Plus,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent, PopoverItem, PopoverSeparator } from '@ui/popover';
import { Button } from '@ui/button';
import { compileLRC as localCompileLRC, compileSRT as localCompileSRT } from '@/shared/utils/lrc';
import { getPlaylists, addProjectToPlaylist, createPlaylist } from '@features/playlists/playlist.service';

type IconComponent = ComponentType<{ className?: string }>;

interface Playlist {
  id: string;
  name: string;
}

interface Project {
  publicId?: string;
  title?: string;
  forksEnabled?: boolean;
  isForkedByMe?: boolean;
  metadata?: { songName?: string };
}

interface User {
  accountName?: string;
  isGuest?: boolean;
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface MenuItemProps {
  icon?: IconComponent;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  children?: ReactNode;
}

// Expandable submenu item
function MenuItem({ icon: Icon, label, onClick, danger, children }: MenuItemProps) {
  const [open, setOpen] = useState(false);
  const style: CSSProperties | undefined = danger ? { color: 'var(--color-red-400, #f87171)' } : undefined;

  if (children) {
    return (
      <div>
        <PopoverItem style={style} onClick={() => setOpen((v) => !v)} className="justify-between">
          <span className="flex items-center gap-2">
            {Icon && <Icon className="size-3.5 opacity-70" />}
            {label}
          </span>
          {open
            ? <ChevronDown className="size-3 opacity-50" />
            : <ChevronRight className="size-3 opacity-50" />}
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
      {Icon && <Icon className="size-3.5 opacity-70" />}
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
          <ListPlus className="size-3.5 opacity-70" />
          {t('projectView.actions.addToList')}
        </span>
        {open
          ? <ChevronDown className="size-3 opacity-50" />
          : <ChevronRight className="size-3 opacity-50" />}
      </PopoverItem>

      {open && (
        <div className="ml-3 pl-2.5 border-l border-zinc-700/50 mt-0.5 mb-0.5">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500">
              <Loader2 className="size-3 animate-spin" />
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
              {added[pl.id] && <Check className="size-3 text-primary shrink-0" />}
            </PopoverItem>
          ))}

          <PopoverSeparator />
          <PopoverItem onClick={handleNewPlaylist}>
            <Plus className="size-3.5 opacity-70" />
            {t('projectView.actions.newList')}
          </PopoverItem>
        </div>
      )}
    </div>
  );
}

interface PalettePartial {
  faded: string;
}

interface ProjectActionsMenuProps {
  project: Project;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lines: any[];
  isOwner: boolean;
  user?: User | null;
  onEdit?: () => void;
  onFork?: () => void;
  palette?: PalettePartial | null;
}

export function ProjectActionsMenu({
  project,
  lines,
  isOwner,
  user,
  onEdit,
  onFork,
  palette,
}: ProjectActionsMenuProps) {
  const { t } = useTranslation();
  const [linkCopied, setLinkCopied] = useState(false);
  const [ogCopied, setOgCopied] = useState(false);

  const slug = (project?.metadata?.songName || project?.title || 'lyrics')
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase();

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch { /* no-op */ }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleShareOg = async () => {
    const origin = import.meta.env.PROD ? (import.meta.env.VITE_SERVER_ORIGIN || '') : window.location.origin;
    const ogUrl = `${origin}/og/project/${project?.publicId}`;
    if (navigator.share) {
      try { await navigator.share({ url: ogUrl, title: project?.title || 'LRC Studio' }); return; }
      catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(ogUrl); } catch { /* no-op */ }
    setOgCopied(true);
    setTimeout(() => setOgCopied(false), 2000);
  };

  const handleExportLrc = () => {
    try {
      const output = localCompileLRC(lines ?? [], false, 'hundredths', project?.metadata ?? {}, 'lf', false, undefined, 0);
      downloadFile(output, `${slug}.lrc`);
    } catch { /* no-op */ }
  };

  const handleExportSrt = () => {
    try {
      const output = localCompileSRT(lines ?? [], 0, false, 'lf', {}, false, 0);
      downloadFile(output, `${slug}.srt`);
    } catch { /* no-op */ }
  };

  const triggerStyle: CSSProperties | undefined = palette
    ? { color: palette.faded, background: 'transparent', border: `1px solid ${palette.faded}`, borderRadius: '9999px' }
    : undefined;

  const canFork = project?.forksEnabled !== false && !project?.isForkedByMe;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          style={triggerStyle}
          className="size-8 rounded-full shrink-0"
          aria-label={t('projectView.actions.menu')}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-52">

        {/* Owner: edit */}
        {isOwner && (
          <>
            <MenuItem icon={Pencil} label={t('projectView.editButton')} onClick={onEdit} />
            <PopoverSeparator />
          </>
        )}

        {/* Non-owner: fork */}
        {!isOwner && canFork && (
          <>
            <MenuItem icon={GitFork} label={t('projectView.forkButton')} onClick={onFork} />
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
        <MenuItem icon={Download} label={t('projectView.actions.export')}>
          <MenuItem icon={FileText} label="LRC (.lrc)" onClick={handleExportLrc} />
          <MenuItem icon={FileCode} label="SRT (.srt)" onClick={handleExportSrt} />
        </MenuItem>

        {/* Share — all users */}
        <MenuItem icon={Share2} label={t('projectView.actions.share')}>
          <MenuItem
            icon={ogCopied ? Check : Share2}
            label={ogCopied ? t('projectView.actions.copied') : t('projectView.actions.shareOg')}
            onClick={handleShareOg}
          />
          <MenuItem
            icon={linkCopied ? Check : Link2}
            label={linkCopied ? t('projectView.actions.copied') : t('projectView.actions.copyLink')}
            onClick={handleCopyLink}
          />
        </MenuItem>

      </PopoverContent>
    </Popover>
  );
}
