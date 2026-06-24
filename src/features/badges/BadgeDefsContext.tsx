import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { gqlRequest } from '@/app/graphql.client';

const BADGE_DEFS_QUERY = /* GraphQL */ `
  query BadgeDefsForLocalization {
    badgeDefinitions {
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

let _cache: BadgeDefsMap | null = null;
let _inflight: Promise<BadgeDefsMap> | null = null;

async function fetchBadgeDefs(): Promise<BadgeDefsMap> {
  if (_cache) return _cache;
  if (_inflight) return _inflight;
  _inflight = gqlRequest<{ badgeDefinitions: BadgeDefLocalized[] }>(BADGE_DEFS_QUERY)
    .then(({ badgeDefinitions }) => {
      _cache = Object.fromEntries(badgeDefinitions.map(d => [d.id, d]));
      _inflight = null;
      return _cache;
    })
    .catch(() => {
      _inflight = null;
      return {} as BadgeDefsMap;
    });
  return _inflight;
}

export function BadgeDefsProvider({ children }: { children: ReactNode }) {
  const [defs, setDefs] = useState<BadgeDefsMap>(_cache ?? {});

  useEffect(() => {
    // Initial state already seeds from _cache; only fetch when not cached.
    if (_cache) return;
    fetchBadgeDefs().then(setDefs);
  }, []);

  return (
    <BadgeDefsContext.Provider value={defs}>
      {children}
    </BadgeDefsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBadgeDefs(): BadgeDefsMap {
  return useContext(BadgeDefsContext);
}
