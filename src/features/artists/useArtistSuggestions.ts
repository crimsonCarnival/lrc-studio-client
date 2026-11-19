import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { fetchArtistSuggestions, fetchCatalogArtistSuggestions, SUGGESTION_LIMIT } from './artist-suggestions.service';

/** One autocomplete row: a name the user credited before, or an approved catalog artist. */
export type SuggestionItem = { key: string; name: string; source: 'own' | 'catalog'; detail?: string };

const lower = (s: string) => s.normalize('NFC').toLowerCase();

/** Own names first (they are what this person uses), then catalog names not already among them. */
export function mergeSuggestions(own: Array<{ id: string; name: string }>, catalog: Array<{ id: string; name: string; disambiguation: string }>): SuggestionItem[] {
  const seen = new Set(own.map((o) => lower(o.name)));
  const fromCatalog = catalog
    .filter((c) => !seen.has(lower(c.name)))
    .map((c): SuggestionItem => ({ key: `catalog:${c.id}`, name: c.name, source: 'catalog', detail: c.disambiguation || undefined }));
  return [...own.map((o): SuggestionItem => ({ key: `own:${o.id}`, name: o.name, source: 'own' })), ...fromCatalog].slice(0, SUGGESTION_LIMIT);
}

export type SuggestionStatus = 'idle' | 'loading' | 'ready' | 'error';

export const SUGGESTION_DEBOUNCE_MS = 200;

/**
 * Autocomplete for the artist fields: the user's own credited names plus approved catalog artists.
 * A failing catalog request only drops the catalog rows. Debounced; every new prefix aborts the request still
 * in flight, and a result is only used if it answers the prefix currently typed, so a slow
 * answer can never overwrite a newer one.
 */
export function useArtistSuggestions(prefix: string, enabled: boolean) {
  const debounced = useDebouncedValue(prefix.trim(), SUGGESTION_DEBOUNCE_MS);
  const [state, setState] = useState<{ forPrefix: string; items: SuggestionItem[]; status: SuggestionStatus }>({
    forPrefix: '', items: [], status: 'idle',
  });

  useEffect(() => {
    if (!enabled || !debounced) return;
    const controller = new AbortController();
    let current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, forPrefix: debounced, status: 'loading' }));
    const catalog = fetchCatalogArtistSuggestions(debounced, { signal: controller.signal }).catch(() => []);
    Promise.all([fetchArtistSuggestions(debounced, { signal: controller.signal }), catalog])
      .then(([page, fromCatalog]) => {
        if (current) setState({ forPrefix: debounced, items: mergeSuggestions(page.items, fromCatalog), status: 'ready' });
      })
      .catch((err) => {
        if (!current || (err as { name?: string })?.name === 'AbortError') return;
        setState({ forPrefix: debounced, items: [], status: 'error' });
      });
    return () => { current = false; controller.abort(); };
  }, [debounced, enabled]);

  const typed = prefix.trim();
  if (!enabled || !typed) return { items: [] as SuggestionItem[], status: 'idle' as SuggestionStatus };
  // Waiting out the debounce: show nothing rather than the answer to an older prefix.
  if (state.forPrefix !== typed) return { items: [] as SuggestionItem[], status: 'loading' as SuggestionStatus };
  return { items: state.items, status: state.status };
}
