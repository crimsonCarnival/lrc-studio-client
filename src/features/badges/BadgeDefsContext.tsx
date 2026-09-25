import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
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

let _cache: BadgeDefsMap | null = null;
let _inflight: Promise<BadgeDefsMap> | null = null;

async function fetchBadgeDefs(): Promise<BadgeDefsMap> {
  if (_cache) return _cache;
  if (_inflight) return _inflight;
  // Failures propagate to the caller (not cached), so the next mount retries.
  _inflight = gqlRequest<{ publicBadgeDefinitions: BadgeDefLocalized[] }>(BADGE_DEFS_QUERY)
    .then(({ publicBadgeDefinitions }) => {
      _cache = Object.fromEntries(publicBadgeDefinitions.map(d => [d.id, d]));
      return _cache;
    })
    .finally(() => { _inflight = null; });
  return _inflight;
}

export function BadgeDefsProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [defs, setDefs] = useState<BadgeDefsMap>(_cache ?? {});

  useEffect(() => {
    // Initial state already seeds from _cache; only fetch when not cached.
    if (_cache) return;
    fetchBadgeDefs()
      .then(setDefs)
      .catch((err: unknown) => {
        console.error('[badges] failed to load badge definitions', err);
        toast.error(t('badges.defsLoadError'), { id: 'badge-defs-load-error' });
      });
  }, [t]);

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
