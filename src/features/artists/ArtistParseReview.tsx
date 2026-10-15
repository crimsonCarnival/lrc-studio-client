import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import { formatArtistDisplay, type ArtistCredit } from '@/shared/utils/artists';
import { applyPlan, defaultDecisions, type ParsePlan, type PlanDecisions } from './artist-parse-review';

interface Props {
  plan: ParsePlan;
  /** Called with the credits (and the title without its feat. segment, if one was extracted) the person confirmed. */
  onApply: (credits: ArtistCredit[], title: string | null) => void;
  onCancel: () => void;
}

const CARD = 'flex flex-col gap-3 rounded-[14px] bg-card p-3 inset-ring inset-ring-hl';
const CHIP = 'rounded-full bg-raised px-2.5 py-1 text-sm text-foreground inset-ring inset-ring-hl';

/**
 * Shows what the parser is unsure about and lets the person decide. Nothing is applied
 * until they press Apply: doubtful splits come with a "join into one artist" switch per
 * boundary, a bare `ft` / `feat` asks whether it is a marker, and the rest are shown as notes.
 */
export function ArtistParseReview({ plan, onApply, onCancel }: Props) {
  const { t } = useTranslation();
  const [decisions, setDecisions] = useState<PlanDecisions>(() => defaultDecisions(plan));
  const [weakChoice, setWeakChoice] = useState<'accept' | 'keep' | null>(null);

  const effective: PlanDecisions = { ...decisions, acceptWeak: weakChoice === 'accept' };
  const result = useMemo(() => applyPlan(plan, effective), [plan, effective.acceptWeak, decisions.merges]); // eslint-disable-line react-hooks/exhaustive-deps
  const needsWeakChoice = plan.weak.length > 0 && weakChoice === null;

  const toggleMerge = (group: number, boundary: number) =>
    setDecisions((d) => ({
      ...d,
      merges: d.merges.map((row, gi) => (gi === group ? row.map((v, bi) => (bi === boundary ? !v : v)) : row)),
    }));

  const tr = t as (k: string, o?: object) => string;

  return (
    <div className={CARD} role="group" aria-label={tr('artists.review.title')}>
      <p className="font-heading text-[15px] font-bold text-foreground">{tr('artists.review.title')}</p>

      {plan.groups.map((group, gi) => (
        <div key={`${group.text}-${gi}`} className="flex flex-col gap-1.5">
          <p className="text-[13px] text-subtle">{tr('artists.review.ambiguous', { text: group.text })}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {group.parts.map((part, pi) => (
              <span key={`${part}-${pi}`} className="inline-flex items-center gap-1.5">
                <span className={CHIP}>{part}</span>
                {pi < group.parts.length - 1 && (
                  <button
                    type="button"
                    aria-pressed={decisions.merges[gi]?.[pi] ?? false}
                    aria-label={tr('artists.review.merge', { a: part, b: group.parts[pi + 1] })}
                    onClick={() => toggleMerge(gi, pi)}
                    className={cn(
                      'grid size-6 place-items-center rounded-full text-xs text-subtle inset-ring inset-ring-hl transition-colors',
                      decisions.merges[gi]?.[pi] && 'bg-primary-soft text-primary-ink inset-ring-iris',
                    )}
                  >
                    <Icon name="link" size={13} />
                  </button>
                )}
              </span>
            ))}
          </div>
          <p className="text-xs text-faint">{tr('artists.review.mergeHint')}</p>
        </div>
      ))}

      {plan.weak.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-[13px] text-subtle">{tr('artists.review.weak', { text: plan.weak[0].text })}</legend>
          <div className="flex flex-wrap gap-2">
            {(['accept', 'keep'] as const).map((choice) => (
              <label key={choice} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input type="radio" name="weak-choice" checked={weakChoice === choice} onChange={() => setWeakChoice(choice)} />
                {tr(`artists.review.weak_${choice}`)}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {plan.warnings.map((flag, i) => (
        <p key={`w-${i}`} role="note" className="flex items-start gap-2 text-[13px] text-subtle">
          <Icon name="warning" size={15} className="mt-0.5 text-gold" />
          {tr(flag.code === 'empty_feat_segment' ? 'artists.review.emptyFeat' : 'artists.review.unbalanced', { text: flag.text })}
        </p>
      ))}
      {plan.duplicates.map((flag, i) => (
        <p key={`d-${i}`} role="note" className="flex items-start gap-2 text-[13px] text-subtle">
          {tr('artists.review.duplicate', { text: flag.text })}
        </p>
      ))}

      <p className="text-[13px] text-subtle" aria-live="polite">
        {tr('artists.review.result')}{' '}
        <span className="font-semibold text-foreground">{formatArtistDisplay(result.credits) || '—'}</span>
        {result.title ? <span className="text-faint"> · {tr('artists.review.newTitle', { title: result.title })}</span> : null}
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>{tr('artists.review.cancel')}</Button>
        <Button type="button" disabled={needsWeakChoice} onClick={() => onApply(result.credits, result.title)}>
          {tr('artists.review.apply')}
        </Button>
      </div>
    </div>
  );
}
