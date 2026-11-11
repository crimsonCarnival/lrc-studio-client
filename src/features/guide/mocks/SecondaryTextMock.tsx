import { useTranslation } from 'react-i18next';
import { parseRubyMarkup } from '@/shared/utils/furigana';

// Sample line and its romaji are not UI copy: the same in every language.
const LINE = '{夜|よる}の{街|まち}';
const ROMAJI = 'yoru no machi';

// One lyric line with its secondary text (romaji) and a translation stacked under it.
export default function SecondaryTextMock() {
  const { t } = useTranslation();
  const { segments } = parseRubyMarkup(LINE);
  const rows = [
    { label: t('editor.primaryText'), body: (
      <span lang="ja" className="text-xl leading-[2.2] text-zinc-100">
        {segments.map((s, i) => (s.reading ? <ruby key={i}>{s.text}<rt className="text-[10px] text-subtle">{s.reading}</rt></ruby> : <span key={i}>{s.text}</span>))}
      </span>
    ) },
    { label: t('editor.secondaryText'), body: <span className="text-sm text-zinc-300">{ROMAJI}</span> },
    { label: t('editor.translationText'), body: <span className="text-sm text-zinc-300">{t('guide.mock.furigana.translation')}</span> },
  ];
  return (
    <dl aria-hidden="true" className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">{row.label}</dt>
          <dd className="m-0 min-w-0 break-words">{row.body}</dd>
        </div>
      ))}
    </dl>
  );
}
