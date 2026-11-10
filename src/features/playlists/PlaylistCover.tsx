import { Icon } from '@/shared/ui/Icon';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { cn } from '@/shared/utils/utils';

/** The slice of a playlist the cover reads. Projects are resolved like everywhere else (`resolveCoverImage`). */
export type PlaylistCoverSource = {
  coverImage?: string | null;
  projects?: ReadonlyArray<{
    coverImage?: string | null;
    upload?: { source?: string | null; uploadUrl?: string | null; coverImage?: string | null } | null;
  }> | null;
};

type PlaylistCoverProps = {
  playlist: PlaylistCoverSource;
  /** Size, rounding and shadow: the cover fills whatever box this gives it. */
  className?: string;
  /** Icon size for the empty tiles, in px. */
  iconSize?: number;
};

// Theme tints for tiles without an image, cycled by position so a mosaic reads as four cells.
const TINTS = [
  'bg-iris/20 text-iris',
  'bg-foam/20 text-foam',
  'bg-love/20 text-love',
  'bg-gold/20 text-gold',
] as const;

/**
 * A playlist's cover: its own image if set, else a 2×2 mosaic of its first four
 * project covers (missing cells become tinted tiles), else one tinted tile.
 */
export function PlaylistCover({ playlist, className, iconSize = 28 }: PlaylistCoverProps) {
  const box = cn('relative shrink-0 overflow-hidden bg-muted', className);

  if (playlist.coverImage) {
    return (
      <div className={box}>
        <img src={playlist.coverImage} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      </div>
    );
  }

  const covers = (playlist.projects ?? []).slice(0, 4).map((p) => resolveCoverImage(p) as string | null);

  if (!covers.some(Boolean)) {
    return (
      <div className={cn(box, 'flex items-center justify-center', TINTS[0])}>
        <Icon name="music_note" size={iconSize} />
      </div>
    );
  }

  const cells = Array.from({ length: 4 }, (_, i) => covers[i] ?? null);
  return (
    <div className={cn(box, 'grid grid-cols-2 grid-rows-2 gap-0.5')}>
      {cells.map((src, i) =>
        src ? (
          <img key={i} src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div key={i} className={cn('flex items-center justify-center', TINTS[i])}>
            <Icon name="music_note" size={Math.round(iconSize / 2)} />
          </div>
        ),
      )}
    </div>
  );
}
