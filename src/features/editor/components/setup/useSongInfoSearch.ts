import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { songMetadata } from '@/app/api';
import type { TrackSuggestion } from '@/features/editor/services/song-metadata.service';

export type { TrackSuggestion };

type TFn = (k: string) => string;

interface SearchArgs {
  songName: string;
  /** The primary artists joined, as typed ("A & B"). */
  artist: string;
  featured: readonly string[];
}

/**
 * The "Find song info" search: runs the lookup and holds the suggestions until the person
 * picks one or closes the list. Nothing is applied without a pick.
 */
export function useSongInfoSearch() {
  const { t } = useTranslation();
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TrackSuggestion[] | null>(null);
  const [query, setQuery] = useState<SearchArgs | null>(null);
  // A newer search wins: answers to an older one are dropped.
  const seq = useRef(0);

  const search = useCallback(async (args: SearchArgs) => {
    const id = ++seq.current;
    setSearching(true);
    try {
      const found = await songMetadata.searchTracks(args.songName, args.artist, args.featured);
      if (id !== seq.current) return;
      if (found.length === 0) {
        setResults(null);
        toast.error((t as TFn)('setup.metaSearchFailed'));
        return;
      }
      setQuery(args);
      setResults(found);
    } catch {
      if (id === seq.current) toast.error((t as TFn)('setup.metaSearchError'));
    } finally {
      if (id === seq.current) setSearching(false);
    }
  }, [t]);

  const close = useCallback(() => { seq.current++; setSearching(false); setResults(null); }, []);

  return { searching, results, query, search, close };
}
