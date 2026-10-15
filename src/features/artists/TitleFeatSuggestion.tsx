import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { featuredNames, joinNames, parseArtists, type ArtistCredit } from '@/shared/utils/artists';
import { ArtistImportReview } from './ArtistImportReview';
import { useArtistImport } from './useArtistImport';

interface Props {
  title: string;
  /** The person accepted: use `title` (feat. segment removed) and add `featured` to the artists. */
  onApply: (title: string, featured: ArtistCredit[]) => void;
}

/**
 * A title like "Song (feat. A & B)" is offered as a clean title plus featured artists. Never
 * applied on its own; a dismissal sticks for that exact title text. A doubtful result (bare
 * `ft`, `A & B`) goes through the same review as a pasted artist string.
 */
export function TitleFeatSuggestion({ title, onApply }: Props) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const importer = useArtistImport();

  const parsed = useMemo(() => parseArtists('', title), [title]);
  const names = joinNames(featuredNames(parsed.credits));

  if (parsed.title === null || !parsed.title || !names || dismissed.has(title)) return null;

  const accept = () =>
    importer.propose({ artist: '', title }, (credits, cleaned) => {
      onApply(cleaned ?? title, credits.map((c) => ({ ...c, role: 'featured' as const })));
    }, 'featured');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-[12px] bg-primary-soft px-3 py-2 text-[13px] text-primary-ink" role="status">
        <span className="min-w-0 flex-1">{(t as (k: string, o?: object) => string)('artists.titleSuggestion.message', { names, title: parsed.title })}</span>
        <Button type="button" size="sm" onClick={accept}>{(t as (k: string) => string)('artists.titleSuggestion.apply')}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setDismissed((d) => new Set(d).add(title))}>
          {(t as (k: string) => string)('artists.titleSuggestion.dismiss')}
        </Button>
      </div>
      <ArtistImportReview importer={importer} />
    </div>
  );
}
