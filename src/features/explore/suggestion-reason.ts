import type { TFunction } from 'i18next';
import type { SuggestionReason } from '@/types/graphql';

/** "Followed by Ana", "Radiohead and 2 more artists in common", "New to LRC Studio". */
export function suggestionReasonText(reason: SuggestionReason, t: TFunction): string {
  if (reason.kind === 'MUTUAL') {
    if (!reason.mutualName) return t('explore.suggested.reason.mutualCount', { count: reason.mutualCount });
    const others = reason.mutualCount - 1;
    return others > 0
      ? t('explore.suggested.reason.mutualMore', { name: reason.mutualName, count: others })
      : t('explore.suggested.reason.mutual', { name: reason.mutualName });
  }
  if (reason.kind === 'TASTE' && reason.sharedArtists.length > 0) {
    const [first] = reason.sharedArtists;
    const others = reason.sharedArtistCount - 1;
    return others > 0
      ? t('explore.suggested.reason.tasteMore', { artists: first, count: others })
      : t('explore.suggested.reason.taste', { artists: first });
  }
  return t('explore.suggested.reason.new');
}
