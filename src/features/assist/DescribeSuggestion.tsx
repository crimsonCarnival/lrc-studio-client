import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { PRIMARY_GENRES } from '@/features/editor/constants/genre-tags';
import { describeSong } from './assist.service';

// The server rejects (400) more than 40 lines or a line over 500 chars.
const MAX_LINES = 40;
const MAX_LINE_CHARS = 500;

export type DescribeApply = { language?: string; genre?: string; tags: string[] };

type Props = {
  input: { title?: string; artist?: string; lines: string[] };
  /** Language values the form accepts. Omit where the form has no language field. */
  languageOptions?: string[];
  onApply: (d: DescribeApply) => void;
};

type Result = { key: string; apply: DescribeApply };

/**
 * Suggests language, genre and tags from the title, artist and opening lyric lines. The request
 * is sent only on click, nothing is applied until the person confirms, and a failed request
 * shows nothing. Only values the form can hold are ever offered: a genre must be one of
 * PRIMARY_GENRES and a language one of `languageOptions`.
 */
export function DescribeSuggestion({ input, languageOptions, onApply }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuthContext();
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const [result, setResult] = useState<Result | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const { title, artist } = input;
  const lines = useMemo(
    () => input.lines.map((l) => l.trim()).filter(Boolean).slice(0, MAX_LINES).map((l) => l.slice(0, MAX_LINE_CHARS)),
    [input.lines],
  );
  const key = JSON.stringify([title ?? '', artist ?? '', lines]);

  if (!user || lines.length === 0) return null;

  const hidden = dismissed.has(key);
  // A response for input that has since changed is never shown.
  const proposal = result?.key === key && !hidden ? result.apply : null;

  // The server answers with a BCP-47 code; the form's language options are display names in the UI
  // language (see useLanguageOptions), so map the code to the matching option value.
  const resolveLanguage = (code: string | null): string | undefined => {
    if (!code || !languageOptions) return undefined;
    let name: string | undefined;
    try { name = new Intl.DisplayNames([i18n.language || 'en'], { type: 'language' }).of(code.split('-')[0]); } catch { /* unknown code */ }
    const wanted = new Set([code.toLowerCase(), name?.toLowerCase()].filter(Boolean));
    return languageOptions.find((o) => wanted.has(o.toLowerCase()));
  };

  const request = async () => {
    setLoadingKey(key);
    try {
      const d = await describeSong({ ...(title ? { title } : {}), ...(artist ? { artist } : {}), lines });
      const language = resolveLanguage(d.language);
      const genre = d.genre && PRIMARY_GENRES.includes(d.genre) ? d.genre : undefined;
      const tags = Array.isArray(d.tags) ? d.tags.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
      if (!language && !genre && tags.length === 0) return;
      setResult({ key, apply: { ...(language ? { language } : {}), ...(genre ? { genre } : {}), tags } });
    } catch {
      // Silent by design: a failed suggestion must not interrupt setup.
    } finally {
      setLoadingKey((cur) => (cur === key ? null : cur));
    }
  };

  const close = () => setDismissed((d) => new Set(d).add(key));

  const summary = proposal
    ? [proposal.language, proposal.genre && (t as (k: string) => string)(`setup.genre.${proposal.genre}`), proposal.tags.join(', ')].filter(Boolean).join(' · ')
    : '';

  return (
    <>
      {!hidden && !proposal && (
        <Button type="button" size="sm" variant="ghost" disabled={loadingKey === key} onClick={request}>{t('editor.assist.describe.suggest')}</Button>
      )}
      <div role="status" className="empty:hidden">
        {proposal && (
          <div className="flex flex-wrap items-center gap-2 rounded-[calc(var(--radius)*1.2)] bg-primary-soft px-3 py-2 text-[13px] text-primary-ink">
            <span className="min-w-0 flex-1">
              <Trans i18nKey="editor.assist.describe.proposal" values={{ summary }} components={{ b: <strong /> }} />
            </span>
            <Button type="button" size="sm" onClick={() => { onApply(proposal); close(); }}>{t('editor.assist.describe.apply')}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={close}>{t('editor.assist.describe.dismiss')}</Button>
          </div>
        )}
      </div>
    </>
  );
}
