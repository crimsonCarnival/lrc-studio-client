import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlRequest } from '@/app/graphql.client';

const BADGE_DEFS_QUERY = /* GraphQL */ `
  query BadgeDefsForLocalization {
    publicBadgeDefinitions {
      id
      label { en es }
      description { en es }
      icon
      color
      rarity
    }
  }
`;

export interface BadgeDefLocalized {
  id: string;
  label: { en: string; es: string };
  description: { en: string; es: string };
  icon: string;
  color: string;
  rarity: string;
}

type BadgeDefsMap = Record<string, BadgeDefLocalized>;

const BadgeDefsContext = createContext<BadgeDefsMap>({});

const NO_DEFS: BadgeDefsMap = {};

async function fetchBadgeDefs(): Promise<BadgeDefsMap> {
  const { publicBadgeDefinitions } = await gqlRequest<{ publicBadgeDefinitions: BadgeDefLocalized[] }>(BADGE_DEFS_QUERY);
  return Object.fromEntries(publicBadgeDefinitions.map(d => [d.id, d]));
}

export function BadgeDefsProvider({ children }: { children: ReactNode }) {
  // Definitions change only when staff edit them, so one load per session is
  // enough; the query cache dedupes concurrent mounts and retries on failure.
  // Failure is silent for the user: this is background data fetched on every page,
  // badges fall back to their built-in labels, and a toast on each cold start or
  // outage says nothing they can act on.
  const { data, error } = useQuery({ queryKey: ['badgeDefs'], queryFn: fetchBadgeDefs, staleTime: Infinity });

  useEffect(() => {
    if (error) console.error('[badges] failed to load badge definitions', error);
  }, [error]);

  return (
    <BadgeDefsContext.Provider value={data ?? NO_DEFS}>
      {children}
    </BadgeDefsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBadgeDefs(): BadgeDefsMap {
  return useContext(BadgeDefsContext);
}
