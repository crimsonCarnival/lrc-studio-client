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

const NO_DEFS: BadgeDefsMap = {};

async function fetchBadgeDefs(): Promise<BadgeDefsMap> {
  try {
    const { publicBadgeDefinitions } = await gqlRequest<{ publicBadgeDefinitions: BadgeDefLocalized[] }>(BADGE_DEFS_QUERY);
    return Object.fromEntries(publicBadgeDefinitions.map(d => [d.id, d]));
  } catch (err) {
    // Silent for the user: badges fall back to their built-in labels, and a toast on an
    // outage says nothing they can act on.
    console.error('[badges] failed to load badge definitions', err);
    throw err;
  }
}

/**
 * Localized badge definitions. Fetched lazily, the first time a badge component mounts,
 * so pages that show no badges (landing, editor) never request them. Definitions change
 * only when staff edit them, so one load per session is enough; the query cache dedupes
 * concurrent consumers and retries after a failure.
 */
export function useBadgeDefs(): BadgeDefsMap {
  const { data } = useQuery({ queryKey: ['badgeDefs'], queryFn: fetchBadgeDefs, staleTime: Infinity });
  return data ?? NO_DEFS;
}
