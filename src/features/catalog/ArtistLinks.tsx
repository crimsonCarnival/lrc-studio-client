import { Link } from 'react-router-dom';
import { ArtistText } from '@/features/artists/ArtistText';
import { creditsOf, nameKey, type ArtistMetadata } from '@/features/artists/artist-credits';
import { featuredNames, primaryNames } from '@/shared/utils/artists';
import { catalogArtistPath } from './catalog-path';
import { useCatalogSlugs } from './catalog.queries';

/**
 * Like `ArtistText`, but primary artists that have a catalog page link to it. Falls back to the plain
 * text when none has one. Not for use inside another link (a card): anchors cannot nest.
 */
export function ArtistLinks({ metadata, className }: { metadata: ArtistMetadata | null | undefined; className?: string }) {
  const credits = creditsOf(metadata);
  const slugs = useCatalogSlugs(credits.map((c) => c.name));
  const primaries = primaryNames(credits);
  if (!primaries.some((n) => slugs.has(nameKey(n)))) return <ArtistText metadata={metadata} className={className} />;

  const feat = featuredNames(credits);
  return (
    <span className={className}>
      {primaries.map((name, i) => {
        const slug = slugs.get(nameKey(name));
        const sep = i === 0 ? '' : i === primaries.length - 1 ? ' & ' : ', ';
        return (
          <span key={`${i}-${name}`}>
            {sep}
            {slug ? <Link to={catalogArtistPath(slug)} className="hover:underline">{name}</Link> : name}
          </span>
        );
      })}
      {feat.length > 0 && <span className="font-normal text-subtle"> feat. {feat.join(', ')}</span>}
    </span>
  );
}
