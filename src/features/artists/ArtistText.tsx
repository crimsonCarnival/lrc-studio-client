import type { ReactNode } from 'react';
import { featuredNames, joinNames, primaryNames } from '@/shared/utils/artists';
import { cn } from '@/shared/utils/utils';
import { artistDisplay, creditsOf, type ArtistMetadata } from './artist-credits';

interface ArtistTextProps {
  metadata: ArtistMetadata | null | undefined;
  className?: string;
  /** Classes for the featured part. Defaults to the muted text colour. */
  featuredClassName?: string;
  /** Shown (in the same element) when there are no artists at all. */
  fallback?: ReactNode;
}

/**
 * The artists of a song: the primary names as they are, then `feat.` and the featured names
 * in a quieter colour. Falls back to the stored display text for legacy rows without credits.
 * The full string is always in `title`, so a truncated line can still be read in full.
 */
export function ArtistText({ metadata, className, featuredClassName, fallback }: ArtistTextProps) {
  const display = artistDisplay(metadata);
  if (!display) return fallback ? <span className={className}>{fallback}</span> : null;

  const credits = creditsOf(metadata);
  const main = joinNames(primaryNames(credits));
  const feat = joinNames(featuredNames(credits));

  if (credits.length === 0 || !feat) {
    return <span className={className} title={display}>{display}</span>;
  }

  return (
    <span className={className} title={display}>
      {main}
      {main ? ' ' : ''}
      <span className={cn('font-normal text-subtle', featuredClassName)}>feat. {feat}</span>
    </span>
  );
}
