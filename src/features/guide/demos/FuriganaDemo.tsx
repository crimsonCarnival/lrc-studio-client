import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseRubyMarkup } from '@/shared/utils/furigana';

// Sample text and its readings, not UI copy: the same in every language.
const INITIAL = '{夜|よる}の{街|まち}';

// Type {word|reading} markup and watch the line render with its readings, as the editor and preview do.
export default function FuriganaDemo() {
  const { t } = useTranslation();
  const [text, setText] = useState(INITIAL);
  const { segments } = parseRubyMarkup(text);

  return (
    <div role="group" aria-label={t('guide.demo.furiganaLabel')} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">{t('guide.demo.furiganaField')}</span>
        <input
          type="text"
          lang="ja"
          autoComplete="off"
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </label>
      <p
        data-testid="furigana-output"
        lang="ja"
        aria-live="polite"
        className="min-h-14 rounded-lg bg-zinc-950 px-3 py-2 text-2xl leading-[2.4] text-zinc-100 break-words"
      >
        {segments.map((seg, i) =>
          seg.reading ? (
            <ruby key={i}>
              {seg.text}
              <rp>(</rp>
              <rt className="text-xs text-subtle">{seg.reading}</rt>
              <rp>)</rp>
            </ruby>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </p>
      <p className="text-xs text-subtle">{t('guide.demo.furiganaHint')}</p>
    </div>
  );
}
