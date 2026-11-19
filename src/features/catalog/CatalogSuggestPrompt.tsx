import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { SubmitCatalogDialog } from './SubmitCatalogDialog';
import type { SubmitTarget } from './SubmitCatalogDialog';
import { useCatalogAlbumSuggestions, useCatalogArtistMatch } from './catalog.queries';

type CatalogSuggestPromptProps =
  | { kind: 'artist'; artist: string }
  | { kind: 'album'; artist: string; album: string };

const same = (a: string, b: string) => a.normalize('NFC').toLowerCase() === b.normalize('NFC').toLowerCase();

/**
 * A quiet "not in the catalog yet" line under a setup field, for verified users only. The artist
 * line shows when no approved artist has that exact name; the album line when the artist is in
 * the catalog (exactly one) but the typed album is not among its approved albums.
 */
export function CatalogSuggestPrompt(props: CatalogSuggestPromptProps) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const [target, setTarget] = useState<SubmitTarget | null>(null);
  const artist = props.artist.trim();
  const album = props.kind === 'album' ? props.album.trim() : '';
  const match = useCatalogArtistMatch(user?.isVerified ? artist : undefined);
  const albums = useCatalogAlbumSuggestions(user?.isVerified && props.kind === 'album' && match.state === 'one' ? artist : undefined);

  if (!user?.isVerified) return null;

  let line: { text: string; next: SubmitTarget } | null = null;
  if (props.kind === 'artist' && match.state === 'none') {
    line = { text: t('catalog.setupPrompt.artist', { name: artist }), next: { kind: 'artist', initialName: artist } };
  } else if (props.kind === 'album' && album && match.state === 'one' && !albums.some((a) => same(a, album))) {
    line = {
      text: t('catalog.setupPrompt.album', { name: album }),
      next: { kind: 'album', artistId: match.artist.id, artistName: match.artist.name, artistSlug: match.artist.slug, initialName: album },
    };
  }

  return (
    <>
      {line && (
        <p className="text-xs text-subtle">
          {line.text}{' '}
          <button type="button" onClick={() => setTarget(line.next)} className="font-semibold text-primary hover:underline">
            {t('catalog.setupPrompt.action')}
          </button>
        </p>
      )}
      {target && <SubmitCatalogDialog open onOpenChange={(open) => { if (!open) setTarget(null); }} target={target} />}
    </>
  );
}
