import { QueryClient } from '@tanstack/react-query';

// gqlRequest and request() throw ApiError, which carries the HTTP status.
const statusOf = (error: unknown) => (error as { status?: number } | null)?.status;

/**
 * Shared cache for server state. Before this, every screen refetched on mount
 * and hand-rolled its own loading / pagination / optimistic state.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached data renders immediately but is always revalidated on mount.
      // Most writes in the app do not invalidate queries yet, so treating a
      // cached result as fresh would show stale lists after an edit elsewhere
      // (e.g. a project created in the editor missing from the library).
      // Queries over slow-moving data opt into a longer staleTime themselves.
      staleTime: 0,
      // A 4xx will not succeed on retry (and a 401 already triggers the token
      // refresh flow); only network failures and 5xx are worth another try.
      retry: (failureCount, error) => {
        // The server answered and said no (forbidden, validation, not found):
        // asking again only delays showing that to the user.
        if ((error as { graphqlErrors?: unknown[] } | null)?.graphqlErrors?.length) return false;
        const status = statusOf(error);
        return (status === undefined || status >= 500) && failureCount < 2;
      },
      // The app never refetched on focus; keep that until a screen opts in.
      refetchOnWindowFocus: false,
    },
  },
});
