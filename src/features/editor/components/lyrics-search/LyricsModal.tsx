import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@ui/dialog';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import { Icon } from '@/shared/ui/Icon';
import type { LyricsProvider } from '@features/editor/services/lyrics-search.service';
import { LogoLoader } from '@ui/LogoLoader';

interface LyricsModalProps {
  song?: { title: string; artist: string } | null;
  lyrics?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onConfirm: (lyrics: string | null | undefined) => void;
  onClose: () => void;
  keepTimestamps?: boolean;
  onKeepTimestampsChange?: (checked: boolean | 'indeterminate') => void;
  showKeepTimestamps?: boolean;
  /** True when `lyrics` is LRC rather than plain text. */
  synced?: boolean;
  /** Which provider answered — shown as attribution. */
  provider?: LyricsProvider;
}

const PROVIDER_LABEL: Record<LyricsProvider, string> = {
  lrclib: 'LRCLIB',
  lyricfind: 'LyricFind',
  lyricsovh: 'lyrics.ovh',
};

type PreviewLine = { time: string; text: string };

const LRC_LINE = /^\[(\d{1,3}:\d{2}(?:[.:]\d{1,3})?)\]\s*(.*)$/;
const LRC_WORD_TAG = /<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g;

/**
 * Display-only split of LRC text into timestamp + text rows. The real parse
 * still happens server-side on import (`/lyrics/parse`); this exists so the
 * preview can show what will be imported, not to produce editor lines.
 * Metadata tags (`[ar:…]`) and blank lines are dropped.
 */
function toPreviewLines(lrc: string): PreviewLine[] {
  const out: PreviewLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const match = LRC_LINE.exec(raw.trim());
    if (!match) continue;
    const text = match[2].replace(LRC_WORD_TAG, '').trim();
    if (text) out.push({ time: match[1], text });
  }
  return out;
}

export default function LyricsModal({ song, lyrics, isLoading, error, onConfirm, onClose, keepTimestamps, onKeepTimestampsChange, showKeepTimestamps = true, synced, provider }: LyricsModalProps) {
  const { t } = useTranslation();

  const ready = !!lyrics && !isLoading;
  const timedLines = useMemo(
    () => (synced && lyrics ? toPreviewLines(lyrics) : []),
    [synced, lyrics],
  );
  // An LRC payload we could not split falls back to the raw text, never to an empty list.
  const showTimed = ready && timedLines.length > 0;
  const dimTimes = showKeepTimestamps && !keepTimestamps;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl flex flex-col gap-0 max-h-[85vh] p-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-7 pt-6 pr-14">
          <DialogTitle className="text-xl font-extrabold tracking-tight">
            {t('lyricsSearch.preview')}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-300">
            {song ? `${song.title} — ${song.artist}` : t('lyricsSearch.previewDesc')}
          </DialogDescription>
        </DialogHeader>

        {synced && !isLoading && !error && (
          <div className="flex items-start gap-3 mx-7 mt-5 px-4 py-3.5 rounded-xl bg-primary/10 border border-primary/25">
            <Icon name="schedule" size={18} className="text-primary mt-0.5 shrink-0" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-primary">{t('lyricsSearch.syncedTitle')}</p>
              <p className="text-zinc-300 leading-snug">{t('lyricsSearch.syncedDesc')}</p>
            </div>
          </div>
        )}

        {showTimed && (
          <div className="flex items-center justify-between gap-3 mx-7 mt-5 mb-2 text-[13px] text-zinc-400">
            <span>{t('lyricsSearch.lineCount', { count: timedLines.length })}</span>
            <span className="font-mono tabular-nums">
              {timedLines[0].time} – {timedLines[timedLines.length - 1].time}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4 mask-edges">
          {isLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-zinc-400">
              <LogoLoader size={16} />
              <span className="text-sm">{t('lyricsSearch.extracting')}</span>
            </div>
          )}

          {error && !isLoading && (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          )}

          {showTimed && (
            <ol className="flex flex-col gap-0.5 py-1">
              {timedLines.map((line, i) => (
                <li key={i} className="flex items-center gap-3.5 px-3 py-1.5 rounded-lg">
                  <span
                    className={`shrink-0 inline-flex items-center h-6 px-2.5 rounded-full bg-primary/10 border border-primary/25 font-mono text-xs font-medium tabular-nums text-primary transition-opacity ${
                      dimTimes ? 'opacity-35 line-through' : ''
                    }`}
                  >
                    {line.time}
                  </span>
                  <span className="min-w-0 text-base text-zinc-100 font-lyrics">{line.text}</span>
                </li>
              ))}
            </ol>
          )}

          {ready && !showTimed && (
            <pre className="px-3 py-5 text-base text-zinc-100 whitespace-pre-wrap font-lyrics leading-relaxed">
              {lyrics}
            </pre>
          )}
        </div>

        {provider && ready && (
          <p className="mx-7 pt-1 text-xs text-zinc-400">
            {t('lyricsSearch.providedBy', { provider: PROVIDER_LABEL[provider] ?? provider })}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-4 px-7 pt-4 pb-5 border-t border-zinc-800">
          {showKeepTimestamps && (
            <label className="inline-flex items-center gap-2.5 min-h-11 mr-auto cursor-pointer select-none">
              <Checkbox
                checked={keepTimestamps}
                onCheckedChange={onKeepTimestampsChange}
                className="size-[18px] border-zinc-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-[15px] text-zinc-100">{t('lyricsSearch.keepTimestamps')}</span>
            </label>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" className="h-11 px-4 text-[15px]" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              className="h-11 px-5 text-[15px] font-semibold"
              onClick={() => onConfirm(lyrics)}
              disabled={!lyrics || isLoading}
            >
              {t('lyricsSearch.useLyrics')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
