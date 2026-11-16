import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { splitTitle } from './assist.service';
import type { TitleSplit } from './assist.types';
import { looksLikeVideoTitle } from './title-heuristics';

type Props = {
  title: string;
  onApply: (split: TitleSplit) => void;
};

type Result = { title: string; split: TitleSplit };

/**
 * A title that looks like a pasted video title offers a one-click cleanup. The request is sent
 * only on click, nothing is applied until the person confirms, a failed request shows nothing,
 * and a dismissal (or Apply) sticks for that exact title text, like TitleFeatSuggestion.
 */
export function TitleCleanupChip({ title, onApply }: Props) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const [result, setResult] = useState<Result | null>(null);
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null);

  if (!user) return null;

  const hidden = dismissed.has(title);
  // A response for a title that has since changed is never shown.
  const split = result?.title === title && !hidden ? result.split : null;
  const showChip = !hidden && !split && looksLikeVideoTitle(title);

  const request = async () => {
    setLoadingTitle(title);
    try {
      const next = await splitTitle(title);
      setResult({ title, split: next });
    } catch {
      // Silent by design: a failed suggestion must not interrupt setup.
    } finally {
      setLoadingTitle((cur) => (cur === title ? null : cur));
    }
  };

  const close = () => setDismissed((d) => new Set(d).add(title));

  return (
    <>
      {showChip && (
        <div className="flex flex-wrap items-center gap-2 rounded-[calc(var(--radius)*1.2)] bg-primary-soft px-3 py-2 text-[13px] text-primary-ink">
          <Button type="button" size="sm" disabled={loadingTitle === title} onClick={request}>{t('editor.assist.titleCleanup.chip')}</Button>
        </div>
      )}
      <div role="status" className="empty:hidden">
        {split && (
          <div className="flex flex-wrap items-center gap-2 rounded-[calc(var(--radius)*1.2)] bg-primary-soft px-3 py-2 text-[13px] text-primary-ink">
            <span className="min-w-0 flex-1">
              <Trans i18nKey="editor.assist.titleCleanup.preview" values={{ song: split.songName, artists: split.artists.join(', ') }} components={{ b: <strong /> }} />
              {split.album && (
                <>
                  {' '}
                  <Trans i18nKey="editor.assist.titleCleanup.previewAlbum" values={{ album: split.album }} components={{ b: <strong /> }} />
                </>
              )}
            </span>
            <Button type="button" size="sm" onClick={() => { onApply(split); close(); }}>{t('editor.assist.titleCleanup.apply')}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={close}>{t('editor.assist.titleCleanup.dismiss')}</Button>
          </div>
        )}
      </div>
    </>
  );
}
