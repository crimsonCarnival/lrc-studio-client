import { useTranslation } from 'react-i18next';
import { SAMPLE_LINES } from '../demos/sample-lines';
import { Icon } from '@/shared/ui/Icon';

const SINGER_TONES = ['text-iris', 'text-foam', 'text-gold', 'text-love'];

// Two sections and a duet: a section marker row, a solo line, and a line with two singers.
export default function SectionsMock() {
  const { t } = useTranslation();
  const chip = (n: number) => (
    <span key={n} className={`inline-flex items-center gap-1 rounded-pill border border-zinc-700 px-2 py-0.5 text-[11px] font-semibold ${SINGER_TONES[n - 1]}`}>
      <Icon name="account_circle" size={12} />
      {t('editor.singerN', { n })}
    </span>
  );
  const rows = [
    { kind: 'section', label: t('editor.sections.verse') },
    { kind: 'line', text: String(t(SAMPLE_LINES[0].key as never)), singers: [1] },
    { kind: 'section', label: t('editor.sections.chorus') },
    { kind: 'line', text: String(t(SAMPLE_LINES[1].key as never)), singers: [1, 2], mode: t('editor.duetMode') },
    { kind: 'line', text: String(t(SAMPLE_LINES[2].key as never)), singers: [2] },
  ];
  return (
    <ul aria-hidden="true" className="flex flex-col gap-1 rounded-xl bg-zinc-900 border border-zinc-800 p-2">
      {rows.map((row, i) =>
        row.kind === 'section' ? (
          <li key={i} className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">{row.label}</li>
        ) : (
          <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-zinc-800/60 p-2">
            <span className="min-w-0 flex-1 basis-48 truncate text-sm text-zinc-100">{row.text}</span>
            <span className="flex flex-wrap items-center gap-1.5">
              {row.singers?.map(chip)}
              {row.mode && <span className="text-[11px] text-subtle">{row.mode}</span>}
            </span>
          </li>
        ),
      )}
    </ul>
  );
}
