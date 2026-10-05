import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

// Stable fallback so consumers' memo/effect deps don't change every render while loading.
const EMPTY: never[] = [];

/**
 * A server list held in the query cache, for screens that fetch a whole list
 * once and then edit it locally (remove on delete, patch on rename).
 * `setItems` takes the same updater a `useState` setter would, so those local
 * edits stay one-liners while the list itself survives navigation.
 */
export function useCachedList<T>(queryKey: QueryKey, queryFn: () => Promise<T[] | null | undefined>) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey, queryFn: async () => (await queryFn()) ?? [] });

  // queryKey is a fresh array each render; its serialized form is the real identity.
  const keyHash = JSON.stringify(queryKey);
  const setItems = useCallback(
    (update: (prev: T[]) => T[]) => {
      queryClient.setQueryData<T[]>(queryKey, (prev) => update(prev ?? []));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, keyHash],
  );

  const { refetch } = query;
  const reload = useCallback(() => { void refetch(); }, [refetch]);

  return {
    items: query.data ?? (EMPTY as T[]),
    loading: query.isPending,
    error: query.isError,
    reload,
    setItems,
  };
}
