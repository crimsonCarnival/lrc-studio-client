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

const IMG = 'size-full object-cover';

/**
 * A playlist's cover: its own image if set, else the layout follows how many of its projects
 * actually have a cover: one fills the whole cover, two split it in halves, three give the
 * first a tall left half over two stacked, four or more make a 2×2 mosaic. With none, one
 * tinted tile. Projects without a cover are skipped, never drawn as empty cells.
 */
export function PlaylistCover({ playlist, className, iconSize = 28 }: PlaylistCoverProps) {
  const box = cn('relative shrink-0 overflow-hidden bg-muted', className);

  if (playlist.coverImage) {
    return (
      <div className={box}>
        <img src={playlist.coverImage} alt="" className={IMG} loading="lazy" decoding="async" />
      </div>
    );
  }

  const covers = (playlist.projects ?? [])
    .map((p) => resolveCoverImage(p) as string | null)
    .filter((src): src is string => Boolean(src))
    .slice(0, 4);

  if (covers.length === 0) {
    return (
      <div className={cn(box, 'flex items-center justify-center bg-iris/20 text-iris')}>
        <Icon name="music_note" size={iconSize} />
      </div>
    );
  }

  if (covers.length === 1) {
    return (
      <div className={box}>
        <img src={covers[0]} alt="" className={IMG} loading="lazy" decoding="async" />
      </div>
    );
  }

  return (
    <div className={cn(box, 'grid grid-cols-2 gap-0.5', covers.length > 2 ? 'grid-rows-2' : 'grid-rows-1')}>
      {covers.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          // Three covers: the first spans both rows of the left column.
          className={cn(IMG, covers.length === 3 && i === 0 && 'row-span-2')}
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  );
}
