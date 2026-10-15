import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { formatArtistDisplay, parseArtists, primaryNames, joinNames, type ArtistCredit } from '@/shared/utils/artists';
import { ArtistImportReview } from './ArtistImportReview';
import { useArtistImport } from './useArtistImport';

interface Props {
  /** The song a search or lookup found: its title and the provider's artist string. */
  song: { title: string; artist: string };
  /** The credits the person chose to apply. */
  onApply: (credits: ArtistCredit[]) => void;
  onSkip: () => void;
  /** The wording: after a lyrics search ("apply") or a file import ("import"). */
  variant?: 'apply' | 'import';
}

/**
 * "Use these artists?" after something found a song's artists for us. Primary artists only
 * by default; featured ones are an explicit opt-in. Doubtful text still goes through the
 * confirm review before anything is applied.
 */
export function ArtistApplyStep({ song, onApply, onSkip, variant = 'apply' }: Props) {
  const { t } = useTranslation();
  const tr = t as (k: string, o?: object) => string;
  const name = useId();
  const importer = useArtistImport();
  const [includeFeatured, setIncludeFeatured] = useState(false);

  const parsed = useMemo(() => parseArtists(song.artist, song.title), [song.artist, song.title]);
  if (parsed.credits.length === 0) return null;

  const hasFeatured = parsed.credits.some((c) => c.role === 'featured');
  const shown = includeFeatured ? formatArtistDisplay(parsed.credits) : joinNames(primaryNames(parsed.credits));

  const use = () =>
    importer.propose({ artist: song.artist, title: song.title }, (credits) => {
      onApply(includeFeatured ? credits : credits.filter((c) => c.role === 'primary'));
    });

  return (
    <div className="flex flex-col gap-2 rounded-[14px] bg-card p-3 inset-ring inset-ring-hl" role="group" aria-label={tr(`artists.${variant}.title`)}>
      <p className="font-heading text-[15px] font-bold text-foreground">{tr(`artists.${variant}.title`)}</p>
      <p className="text-[13px] text-subtle">
        {variant === 'apply'
          ? tr('artists.apply.body', { song: song.title, artists: shown })
          : tr('artists.import.body', { artists: shown })}
      </p>
      {hasFeatured && (
        <div className="flex flex-wrap gap-4">
          {([false, true] as const).map((withFeatured) => (
            <label key={String(withFeatured)} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input type="radio" name={name} checked={includeFeatured === withFeatured} onChange={() => setIncludeFeatured(withFeatured)} />
              {tr(withFeatured ? 'artists.apply.includeFeatured' : 'artists.apply.primaryOnly')}
            </label>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSkip}>{tr(`artists.${variant}.skip`)}</Button>
        <Button type="button" onClick={use}>{tr(`artists.${variant}.use`)}</Button>
      </div>
      <ArtistImportReview importer={importer} />
    </div>
  );
}
