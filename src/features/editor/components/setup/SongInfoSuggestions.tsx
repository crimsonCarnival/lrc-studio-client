import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import type { TrackSuggestion } from '@/features/editor/services/song-metadata.service';

// Typed i18next rejects keys that take options without a cast.
type TFn = (k: string, o?: Record<string, unknown>) => string;

interface Props {
  results: readonly TrackSuggestion[];
  /** What was searched, to say so when nothing is by that artist. */
  artist: string;
  onPick: (track: TrackSuggestion) => void;
  onClose: () => void;
}

/** The ranked tracks to choose from, best first. Tracks by another artist sit below a divider. */
export function SongInfoSuggestions({ results, artist, onPick, onClose }: Props) {
  const { t } = useTranslation();
  const tt = t as TFn;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.querySelector<HTMLButtonElement>('button[data-pick]')?.focus();
  }, [results]);

  const matches = results.filter((r) => r.artistMatch);
  const others = results.filter((r) => !r.artistMatch);

  const row = (track: TrackSuggestion, best: boolean) => {
    const details = [track.album, track.releaseYear].filter(Boolean).join(' · ');
    return (
      <li key={`${track.provider}:${track.trackId}:${track.name}`}>
        <button
          type="button"
          data-pick
          onClick={() => onPick(track)}
          className={`group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-zinc-800/80 focus-visible:bg-zinc-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            track.artistMatch ? '' : 'opacity-70 hover:opacity-100'
          }`}
        >
          {track.albumArt ? (
            <img src={track.albumArt} alt="" width={44} height={44} loading="lazy" referrerPolicy="no-referrer" className="size-11 shrink-0 rounded-md object-cover bg-zinc-800" />
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-500">
              <Icon name="music_note" size={18} />
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-zinc-100">{track.name}</span>
              {track.explicit && (
                <span className="shrink-0 rounded-sm bg-zinc-700 px-1 text-[10px] font-bold leading-4 text-zinc-300" aria-label={tt('setup.explicit')}>E</span>
              )}
            </span>
            <span className="truncate text-xs text-zinc-400">{track.artist}</span>
            {details && <span className="truncate text-[11px] text-zinc-500">{details}</span>}
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            {best && (
              <span className="rounded-pill bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-ink">
                {tt('setup.songSuggestions.best')}
              </span>
            )}
            {!best && track.featuredMatch && (
              <span className="rounded-pill bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                {tt('setup.songSuggestions.withFeatured')}
              </span>
            )}
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 group-hover:text-zinc-400">
              {tt('setup.songSuggestions.use')}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label={tt('setup.songSuggestions.title')}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
      className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-950/80 p-2"
    >
      <div className="flex items-center justify-between gap-2 px-2 pt-1">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300">{tt('setup.songSuggestions.title')}</p>
          <p className="text-[11px] text-zinc-500">{tt('setup.songSuggestions.hint')}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label={tt('setup.songSuggestions.close')} className="h-8 w-8 shrink-0 p-0">
          <Icon name="close" size={16} />
        </Button>
      </div>

      {matches.length === 0 && (
        <p className="mx-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-400" role="status">
          {tt('setup.songSuggestions.noArtistMatch', { artist })}
        </p>
      )}

      {matches.length > 0 && <ul className="flex flex-col">{matches.map((r, i) => row(r, i === 0))}</ul>}

      {others.length > 0 && (
        <>
          <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            {tt('setup.songSuggestions.otherArtists')}
          </p>
          <ul className="flex flex-col">{others.map((r) => row(r, false))}</ul>
        </>
      )}
    </div>
  );
}
