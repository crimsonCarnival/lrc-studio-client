import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { fetchArtistSuggestions, type ArtistSuggestion } from './artist-suggestions.service';

export type SuggestionStatus = 'idle' | 'loading' | 'ready' | 'error';

export const SUGGESTION_DEBOUNCE_MS = 200;

/**
 * Autocomplete for the artist fields. Debounced; every new prefix aborts the request still
 * in flight, and a result is only used if it answers the prefix currently typed, so a slow
 * answer can never overwrite a newer one.
 */
export function useArtistSuggestions(prefix: string, enabled: boolean) {
  const debounced = useDebouncedValue(prefix.trim(), SUGGESTION_DEBOUNCE_MS);
  const [state, setState] = useState<{ forPrefix: string; items: ArtistSuggestion[]; status: SuggestionStatus }>({
    forPrefix: '', items: [], status: 'idle',
  });

  useEffect(() => {
    if (!enabled || !debounced) return;
    const controller = new AbortController();
    let current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, forPrefix: debounced, status: 'loading' }));
    fetchArtistSuggestions(debounced, { signal: controller.signal })
      .then((page) => { if (current) setState({ forPrefix: debounced, items: page.items, status: 'ready' }); })
      .catch((err) => {
        if (!current || (err as { name?: string })?.name === 'AbortError') return;
        setState({ forPrefix: debounced, items: [], status: 'error' });
      });
    return () => { current = false; controller.abort(); };
  }, [debounced, enabled]);

  const typed = prefix.trim();
  if (!enabled || !typed) return { items: [] as ArtistSuggestion[], status: 'idle' as SuggestionStatus };
  // Waiting out the debounce: show nothing rather than the answer to an older prefix.
  if (state.forPrefix !== typed) return { items: [] as ArtistSuggestion[], status: 'loading' as SuggestionStatus };
  return { items: state.items, status: state.status };
}
