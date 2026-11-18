import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { featuredNames, joinNames, primaryNames } from '@/shared/utils/artists';
import { cn } from '@/shared/utils/utils';
import { artistDisplay, creditsOf, type ArtistMetadata } from './artist-credits';
import { Tip } from '@ui/tip';

interface ArtistTextProps {
  metadata: ArtistMetadata | null | undefined;
  className?: string;
  /** Classes for the featured part. Defaults to the muted text colour. */
  featuredClassName?: string;
  /** Shown (in the same element) when there are no artists at all. */
  fallback?: ReactNode;
  /** Link each credited name that has a catalog page. Leave off inside an existing link. */
  linkArtists?: boolean;
}

/** Names joined like `joinNames`, each one a link to its catalog page when it has a slug. */
function linkedNames(names: string[], slugs: Map<string, string | null | undefined>): ReactNode {
  return names.map((name, i) => {
    const slug = slugs.get(name);
    const sep = i === 0 ? '' : i === names.length - 1 ? ' & ' : ', ';
    return (
      <Fragment key={`${i}:${name}`}>
        {sep}
        {slug ? <Link to={`/artists/${encodeURIComponent(slug)}`} className="hover:underline">{name}</Link> : name}
      </Fragment>
    );
  });
}

/**
 * The artists of a song: the primary names as they are, then `feat.` and the featured names
 * in a quieter colour. Falls back to the stored display text for legacy rows without credits.
 * The full string is always in `title`, so a truncated line can still be read in full.
 */
export function ArtistText({ metadata, className, featuredClassName, fallback, linkArtists }: ArtistTextProps) {
  const display = artistDisplay(metadata);
  if (!display) return fallback ? <span className={className}>{fallback}</span> : null;

  const credits = creditsOf(metadata);
  const primaries = primaryNames(credits);
  const featured = featuredNames(credits);
  const feat = joinNames(featured);

  // `creditsOf` renumbers and drops the read-only slug, so look it up on the raw credits.
  const slugs = new Map((linkArtists ? (metadata?.artists ?? []) : []).map((c) => [c.name, c.catalogSlug]));
  const render = (names: string[]): ReactNode => (linkArtists ? linkedNames(names, slugs) : joinNames(names));

  if (credits.length === 0 || !feat) {
    return <Tip content={display}><span className={className}>{credits.length === 0 ? display : render(primaries)}</span></Tip>;
  }

  return (
    <Tip content={display}>
      <span className={className}>
        {render(primaries)}
        {primaries.length ? ' ' : ''}
        <span className={cn('font-normal text-subtle', featuredClassName)}>feat. {render(featured)}</span>
      </span>
    </Tip>
  );
}
