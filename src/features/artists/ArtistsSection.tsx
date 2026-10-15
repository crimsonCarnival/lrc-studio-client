import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import type { ArtistCredit } from '@/shared/utils/artists';
import { ArtistApplyStep } from './ArtistApplyStep';
import { ArtistImportReview } from './ArtistImportReview';
import { ArtistsInput } from './ArtistsInput';
import { mergeCredits, nameKey, renumber } from './artist-credits';
import { useArtistImport } from './useArtistImport';

export interface ArtistsSectionHandle {
  /** A track lookup found these artists (the provider's single string). The lookup's artists lead; yours stay. */
  proposeFromLookup: (artistText: string) => void;
  /** A search or an imported file found a song with these artists: offer them (primary only by default). */
  offer: (song: { title: string; artist: string }, variant: 'apply' | 'import') => void;
}

interface ArtistsSectionProps {
  value: ArtistCredit[];
  onChange: (next: ArtistCredit[]) => void;
  idPrefix: string;
  ref?: Ref<ArtistsSectionHandle>;
}

/**
 * The artist editor plus everything that can bring artists in from elsewhere (lookup, lyrics
 * search, imported file), each confirmed before it is applied. A form drops this in and drives
 * it through the ref; the form itself only has to keep the `value`.
 */
export function ArtistsSection({ value, onChange, idPrefix, ref }: ArtistsSectionProps) {
  const importer = useArtistImport();
  const [offered, setOffered] = useState<{ title: string; artist: string; variant: 'apply' | 'import' } | null>(null);
  // Async results (a lookup) must merge into what is there when they arrive, not when they were asked for.
  const latest = useRef(value);
  useEffect(() => { latest.current = value; });

  useImperativeHandle(ref, () => ({
    proposeFromLookup: (artistText) => {
      importer.propose({ artist: artistText }, (incoming) => {
        const known = new Set(incoming.map((c) => nameKey(c.name)));
        onChange(renumber([...incoming, ...latest.current.filter((c) => !known.has(nameKey(c.name)))]));
      });
    },
    offer: (song, variant) => setOffered({ ...song, variant }),
  }), [importer, onChange]);

  return (
    <div className="flex flex-col gap-3">
      <ArtistsInput idPrefix={idPrefix} value={value} onChange={onChange} />
      <ArtistImportReview importer={importer} />
      {offered && (
        <ArtistApplyStep
          song={offered}
          variant={offered.variant}
          onSkip={() => setOffered(null)}
          onApply={(incoming) => {
            onChange(mergeCredits(latest.current, incoming));
            setOffered(null);
          }}
        />
      )}
    </div>
  );
}
