import { useCallback, useState } from 'react';
import type { ArtistCredit, ArtistRole } from '@/shared/utils/artists';
import { applyPlan, buildPlan, defaultDecisions, needsReview, type ParsePlan } from './artist-parse-review';

interface Pending {
  plan: ParsePlan;
  apply: (credits: ArtistCredit[], title: string | null) => void;
}

/**
 * Brings artist text from somewhere else (a track lookup, an imported file, a pasted string)
 * into the credits. Text with nothing doubtful is applied straight away; anything the parser
 * flagged waits for the person in an {@link ArtistParseReview} (`pending`).
 */
export function useArtistImport() {
  const [pending, setPending] = useState<Pending | null>(null);

  const propose = useCallback((
    raw: { artist: string; title?: string },
    apply: (credits: ArtistCredit[], title: string | null) => void,
    role?: ArtistRole,
  ) => {
    const plan = buildPlan(raw, role);
    if (!needsReview(plan)) {
      const { credits, title } = applyPlan(plan, defaultDecisions(plan));
      apply(credits, title);
      return;
    }
    setPending({ plan, apply });
  }, []);

  const confirm = useCallback((credits: ArtistCredit[], title: string | null) => {
    setPending((p) => {
      p?.apply(credits, title);
      return null;
    });
  }, []);

  const cancel = useCallback(() => setPending(null), []);

  return { pending, propose, confirm, cancel };
}

export type ArtistImporter = ReturnType<typeof useArtistImport>;
