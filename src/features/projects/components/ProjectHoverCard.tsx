import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { gqlRequest } from '@/app/graphql.client';
import { Icon } from '@/shared/ui/Icon';
import { LazyImage } from '@ui/LazyImage';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { artistDisplay, type ArtistCredit } from '@/features/artists/artist-credits';
import { projectPath } from '@/features/projects/project-path';
import { profilePath } from '@/features/profile/profile-path';

interface MiniProject {
  publicId: string;
  slug: string | null;
  title: string | null;
  coverImage: string | null;
  lineCount: number | null;
  hasWordSync: boolean | null;
  starCount: number | null;
  viewCount: number | null;
  metadata: { songName: string | null; songArtist: string | null; artists: ArtistCredit[] | null } | null;
  upload: { coverImage: string | null; duration: number | null } | null;
  user: { accountName: string; displayName: string | null; avatarUrl: string | null } | null;
}

async function fetchMiniProject(publicId: string): Promise<MiniProject | null> {
  const data = await gqlRequest<{ publicProject: MiniProject | null }>(/* GraphQL */ `
    query MiniProject($publicId: String!) {
      publicProject(publicId: $publicId) {
        publicId slug title coverImage lineCount hasWordSync starCount viewCount
        metadata { songName songArtist artists { name role order } }
        upload { coverImage duration }
        user { accountName displayName avatarUrl }
      }
    }
  `, { publicId });
  return data.publicProject;
}

const OPEN_DELAY = 280;
const CLOSE_DELAY = 120;
const CARD_WIDTH = 300;
// Projects recur in a thread; re-hovering one within a minute reuses the card.
const STALE_MS = 60_000;

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * A hover preview for a project link: cover, song, owner and counts. Fetched on first open.
 * Touch screens never hover, so there the child link simply navigates.
 */
export function ProjectHoverCard({ publicId, children }: { publicId: string; children: ReactNode }) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  const { data: project, isFetched } = useQuery({
    queryKey: ['project', publicId, 'mini'],
    queryFn: () => fetchMiniProject(publicId),
    enabled: open,
    staleTime: STALE_MS,
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);
  const startOpen = () => { clearTimer(); timerRef.current = setTimeout(() => setOpen(true), OPEN_DELAY); };
  const startClose = () => { clearTimer(); timerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY); };

  // Below the trigger, or above it when there is no room; kept inside the viewport.
  const updatePos = useCallback(() => {
    if (!triggerRef.current || !cardRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const cardH = cardRef.current.getBoundingClientRect().height;
    let top = rect.bottom + 8 + window.scrollY;
    if (rect.bottom + cardH + 8 > window.innerHeight) top = rect.top - cardH - 8 + window.scrollY;
    let left = rect.left + window.scrollX;
    if (left + CARD_WIDTH > window.innerWidth + window.scrollX) left = window.innerWidth + window.scrollX - CARD_WIDTH - 8;
    setPos({ top, left: Math.max(8 + window.scrollX, left) });
  }, []);

  useEffect(() => { if (open) updatePos(); }, [open, project, updatePos]);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, { passive: true });
    return () => window.removeEventListener('scroll', close);
  }, [open]);
  useEffect(() => clearTimer, [clearTimer]);

  const owner = project?.user?.accountName;
  const href = project ? projectPath(project, owner) : null;
  const cover = project ? resolveCoverImage(project) : null;
  const title = project?.metadata?.songName || project?.title || t('library.untitled');
  const artist = project?.metadata ? artistDisplay(project.metadata) : '';

  return (
    <>
      <span ref={triggerRef} onMouseEnter={startOpen} onMouseLeave={startClose} className="inline">
        {children}
      </span>
      {open && createPortal(
        <div
          ref={cardRef}
          onMouseEnter={clearTimer}
          onMouseLeave={startClose}
          role="dialog"
          aria-busy={!isFetched}
          aria-label={project ? t('projectView.hoverCard.label', { title }) : t('projectView.hoverCard.loading')}
          style={{ position: 'absolute', top: pos.top, left: pos.left, width: CARD_WIDTH, visibility: pos.top === -9999 ? 'hidden' : 'visible' }}
          className="z-popover flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 shadow-[0_18px_40px_rgba(0,0,0,.5)] animate-fade-in"
        >
          {!isFetched ? (
            <div className="flex gap-3" aria-hidden>
              <div className="size-16 shrink-0 animate-pulse rounded-xl bg-zinc-800" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <div className="h-4 w-3/4 animate-pulse rounded-xs bg-zinc-800" />
                <div className="h-3 w-1/2 animate-pulse rounded-xs bg-zinc-800" />
              </div>
            </div>
          ) : !project ? (
            <p className="text-sm text-zinc-400">{t('profile.wall.tagHiddenProject')}</p>
          ) : (
            <>
              <div className="flex gap-3">
                {cover ? (
                  <LazyImage src={cover} alt="" className="size-16 shrink-0 rounded-xl bg-raised object-cover" />
                ) : (
                  <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-xl bg-raised">
                    <Icon name="music_note" size={26} className="text-subtle" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {href ? (
                    <Link to={href} onClick={() => setOpen(false)} className="line-clamp-2 font-heading text-[16px] font-bold leading-tight text-zinc-100 hover:underline">
                      {title}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 font-heading text-[16px] font-bold leading-tight text-zinc-100">{title}</p>
                  )}
                  {artist && <p className="mt-0.5 truncate text-[13px] text-zinc-400">{artist}</p>}
                  {owner && (
                    <Link to={profilePath(owner)} onClick={() => setOpen(false)} className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
                      {project.user?.avatarUrl
                        ? <img src={project.user.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-4 shrink-0 rounded-full object-cover" />
                        : <Icon name="person" size={14} className="shrink-0" />}
                      <span className="truncate">{t('profile.shared.by', { name: project.user?.displayName || owner })}</span>
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-medium text-zinc-400">
                <span className={`inline-flex h-6 items-center gap-1 rounded-pill px-2 ${project.hasWordSync ? 'bg-primary-soft text-primary-ink' : 'bg-zinc-800'}`}>
                  <Icon name={project.hasWordSync ? 'view_week' : 'subject'} size={12} />
                  {project.hasWordSync ? t('projectView.syncByWord') : t('projectView.syncByLine')}
                </span>
                {project.lineCount ? <span className="inline-flex h-6 items-center rounded-pill bg-zinc-800 px-2">{t('projectView.lineCount', { count: project.lineCount })}</span> : null}
                {project.upload?.duration ? <span className="inline-flex h-6 items-center rounded-pill bg-zinc-800 px-2 tabular-nums">{clock(project.upload.duration)}</span> : null}
              </div>
              <div className="flex items-center gap-3 border-t border-zinc-800 pt-2.5 font-mono text-xs tabular-nums text-zinc-400">
                <span className="flex items-center gap-1" title={t('projectView.statStars')}><Icon name="star" size={13} />{project.starCount ?? 0}</span>
                <span className="flex items-center gap-1" title={t('projectView.statViews')}><Icon name="visibility" size={13} />{project.viewCount ?? 0}</span>
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
