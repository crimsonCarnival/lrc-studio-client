import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import { Button } from '@ui/button';
import { singerLabelChanges } from '@/features/editor/utils/singer-labels';
import type { EditorLine } from '@/features/editor/editor.types';
import type { SingerLabel } from './assist.types';

type SingerLabelsReviewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `labels[k].lineIndex` indexes `opened`, the main lines that were sent. */
  labels: SingerLabel[];
  opened: EditorLine[];
  /** Called with exactly what was reviewed; the caller matches it back to the current lines. */
  onApply: (labels: SingerLabel[], opened: EditorLine[]) => void;
};

/** Lists the suggested singer changes for the user to accept or discard; nothing is written until Apply. */
export function SingerLabelsReview({ open, onOpenChange, labels, opened, onApply }: SingerLabelsReviewProps) {
  const { t } = useTranslation();
  const proposals = useMemo(
    () => labels.flatMap((label) => {
      const line = opened[label.lineIndex];
      return line && singerLabelChanges(line, label.singers) ? [{ line, label }] : [];
    }),
    [labels, opened],
  );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('editor.assist.singers.reviewTitle')}
      description={t('editor.assist.singers.reviewDescription')}
      dialogProps={{ className: 'sm:max-w-xl' }}
    >
      <div className="flex flex-col gap-3 py-2">
        {proposals.length === 0 ? (
          <p className="text-[13px] text-subtle">{t('editor.assist.singers.none')}</p>
        ) : (
          <ul className="lrc-scroll flex max-h-[min(50vh,420px)] flex-col gap-1 overflow-y-auto">
            {proposals.map(({ line, label }) => (
              <li key={label.lineIndex} className="flex flex-col gap-0.5 rounded-lg bg-raised px-3 py-2">
                <span className="truncate text-[14px] text-foreground">{line.text || '♪'}</span>
                <span className="text-[12px] text-subtle">
                  {line.singers?.length ? line.singers.join(', ') : '—'}
                  {' → '}
                  <span className="font-semibold text-foreground">{label.singers.join(', ')}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('editor.assist.singers.cancel')}</Button>
          {proposals.length > 0 && (
            <Button onClick={() => { onApply(labels, opened); onOpenChange(false); }}>{t('editor.assist.singers.apply')}</Button>
          )}
        </div>
      </div>
    </ResponsiveModal>
  );
}

export default SingerLabelsReview;
