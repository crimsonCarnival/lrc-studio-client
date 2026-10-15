import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/dialog';
import { LazyImage } from '@ui/LazyImage';
import { LogoLoader } from '@ui/LogoLoader';
import { Icon } from '@/shared/ui/Icon';
import { projectsService } from '@/features/projects/services/projects.service';
import { ogShareUrl } from '@/features/projects/og-url';
import { ShareSheet } from './ShareSheet';
import type { Project } from '@/types';

interface ShareProjectPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Share a project" entry point that isn't already pinned to one project (unlike the
 * project page's own share button): lists the signed-in user's PUBLISHED projects —
 * sharing a private one would hand out a link nobody else can open — and opens the same
 * ShareSheet used everywhere else once one is picked.
 */
export function ShareProjectPickerModal({ open, onOpenChange }: ShareProjectPickerModalProps) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);

  // Reset the selection the moment the dialog re-opens, during render rather than in an
  // effect (the component stays mounted across opens, so there's no mount to reset on) —
  // react.dev's "adjusting state when a prop changes" pattern. State, not a ref: this
  // project's lint (React Compiler rules) disallows reading/writing refs during render.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSelected(null);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    projectsService.list(100).then((all) => {
      if (!cancelled) setProjects(all.filter((p) => p.public));
    }).catch(() => {
      if (!cancelled) setProjects([]);
    });
    return () => { cancelled = true; };
  }, [open]);

  if (selected) {
    return (
      <ShareSheet
        open={open}
        onOpenChange={onOpenChange}
        url={ogShareUrl(selected.publicId)}
        title={selected.metadata?.songName || selected.title || 'LRC Studio'}
        subtitle={selected.metadata?.songArtist ?? undefined}
        projectName={selected.title ?? undefined}
        coverImage={selected.coverImage}
        genre={selected.metadata?.genre}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('share.picker.title')}</DialogTitle>
        </DialogHeader>

        {projects === null ? (
          <div className="flex justify-center py-8">
            <LogoLoader size={28} className="text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4">{t('share.picker.noPublicProjects')}</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto -mx-2">
            {projects.map((project) => (
              <button
                key={project.publicId}
                type="button"
                onClick={() => setSelected(project)}
                className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-zinc-800/60 transition-colors"
              >
                <div className="size-11 shrink-0 rounded-lg bg-zinc-800 overflow-hidden flex items-center justify-center">
                  {project.coverImage ? (
                    <LazyImage src={project.coverImage} alt="" className="size-full object-cover" />
                  ) : (
                    <Icon name="music_note" size={18} className="text-zinc-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {project.metadata?.songName || project.title || t('share.sheet.title')}
                  </p>
                  {project.metadata?.songArtist && (
                    <p className="truncate text-xs text-zinc-400">{project.metadata.songArtist}</p>
                  )}
                </div>
                <Icon name="chevron_right" size={18} className="shrink-0 text-zinc-500" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
