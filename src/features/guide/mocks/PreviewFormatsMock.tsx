import { useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { formatTimestamp } from '@/shared/utils/lrc';
import { SAMPLE_LINES } from '../demos/sample-lines';

const FORMATS = ['lrc', 'srt', 'txt'] as const;
type Format = (typeof FORMATS)[number];

// SRT timestamps are HH:MM:SS,mmm
function srtTime(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
}

function buildOutput(format: Format, t: TFunction): string {
  const lines = SAMPLE_LINES.slice(0, 4).map((l) => ({ ...l, text: t(l.key as never) as string }));
  if (format === 'lrc') return lines.map((l) => `[${formatTimestamp(l.time)}]${l.text}`).join('\n');
  if (format === 'srt') return lines.map((l, i) => `${i + 1}\n${srtTime(l.time)} --> ${srtTime(l.end)}\n${l.text}`).join('\n\n');
  return lines.map((l) => l.text).join('\n');
}

// Output tabs showing the same sample lines in each export format.
export default function PreviewFormatsMock() {
  const { t } = useTranslation();
  const [format, setFormat] = useState<Format>('lrc');
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex flex-col gap-3">
      <div role="tablist" aria-label={t('guide.mock.preview.tabs')} className="flex gap-1">
        {FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            id={`guide-format-${f}`}
            aria-selected={format === f}
            aria-controls="guide-format-panel"
            onClick={() => setFormat(f)}
            className={`h-11 min-w-16 px-4 rounded-pill border text-sm font-mono font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${format === f ? 'bg-primary/20 border-primary/50 text-primary' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
          >
            .{f}
          </button>
        ))}
      </div>
      <pre id="guide-format-panel" role="tabpanel" aria-labelledby={`guide-format-${format}`} tabIndex={0} className="overflow-x-auto rounded-lg bg-zinc-950 border border-zinc-800 p-3 font-mono text-xs leading-relaxed text-zinc-300">
        {buildOutput(format, t)}
      </pre>
    </div>
  );
}
