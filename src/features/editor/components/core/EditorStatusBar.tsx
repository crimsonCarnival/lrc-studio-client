import { memo, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Tip } from '@ui/tip';
import { formatTime } from '@/shared/utils/format-time';

interface EditorStatusBarProps {
  /** Lyric number of the cursor line, 0 when the cursor is on a section marker. */
  lineNumber: number;
  totalLines: number;
  syncedLines: number;
  /** Already-localised label of the section the cursor is in. */
  sectionLabel?: string;
  wordCount: number;
  charCount: number;
  charCountNoSpaces: number;
  selectedCount: number;
  /** 'LRC' | 'SRT' | the words-mode label: what an export would produce right now. */
  format: string;
  /** Seconds of the song covered by synced lines, and the song's length (0 = no media). */
  coveredSeconds: number;
  duration: number;
  /** When the server last stored this project (ISO, with offset), or null if it never has. */
  lastSavedAt: string | null;
  /** Unsaved changes are waiting: the saved time is then of an older version. */
  dirty: boolean;
  /** A guest draft: it lives in this browser, never on the server. */
  local?: boolean;
}

const MINUTE = 60_000;

/** "just now", "3 min ago", "2 h ago", or the date for anything older than a day. */
function savedAgo(iso: string, now: number, locale: string): string | null {
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return null;
  const minutes = Math.round((now - at) / MINUTE);
  if (minutes < 1) return null;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), 'hour');
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(at);
}

/**
 * Ticks once a minute so "3 min ago" stays true. Lives in its own cell so only it re-renders,
 * and is keyed by the save time, so a new save remounts it with a fresh clock.
 */
function LastSaved({ at, dirty, local }: { at: string | null; dirty: boolean; local?: boolean }) {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!at) return;
    const id = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(id);
  }, [at]);
  if (local) return <Cell tip={t('editor.statusBar.localTip')}>{t('editor.statusBar.local')}</Cell>;
  if (!at) return <Cell>{t('editor.statusBar.neverSaved')}</Cell>;
  const ago = savedAgo(at, now, i18n.language);
  const exact = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at));
  return (
    <Cell tip={t('editor.statusBar.savedAt', { time: exact })}>
      <span aria-hidden className={`size-1.5 rounded-full ${dirty ? 'bg-gold' : 'bg-foam'}`} />
      {ago ? t('editor.statusBar.saved', { ago }) : t('editor.statusBar.savedJustNow')}
    </Cell>
  );
}

function Cell({ children, tip }: { children: ReactNode; tip?: string }) {
  const cell = <span className="inline-flex h-full items-center gap-1.5 whitespace-nowrap px-2.5">{children}</span>;
  return tip ? <Tip content={tip}>{cell}</Tip> : cell;
}

/**
 * The strip along the bottom of the editor, as in a word processor: where the cursor is, how
 * much of the song is synced, and how long the lyrics are. Read-only; every number here is
 * also reachable elsewhere, this is where they sit together.
 */
function EditorStatusBar({
  lineNumber, totalLines, syncedLines, sectionLabel, wordCount, charCount, charCountNoSpaces, selectedCount, format,
  coveredSeconds, duration, lastSavedAt, dirty, local,
}: EditorStatusBarProps) {
  const { t } = useTranslation();
  const percent = totalLines ? Math.round((syncedLines / totalLines) * 100) : 0;
  return (
    <footer
      aria-label={t('editor.statusBar.label')}
      className="max-lg:hidden flex h-7 shrink-0 items-center divide-x divide-hl border-t border-hl bg-card px-1.5 font-mono text-[11px] tabular-nums text-subtle select-none"
    >
      <Cell>
        {lineNumber > 0 ? t('editor.statusBar.line', { line: lineNumber, total: totalLines }) : t('editor.statusBar.noLine', { total: totalLines })}
        {sectionLabel && <span className="text-label uppercase tracking-[0.08em]">{sectionLabel}</span>}
      </Cell>
      <Cell>
        <span
          role="progressbar"
          aria-label={t('editor.statusBar.synced', { synced: syncedLines, total: totalLines, percent })}
          aria-valuemin={0}
          aria-valuemax={totalLines}
          aria-valuenow={syncedLines}
          className="block h-1 w-12 overflow-hidden rounded-sm bg-hl"
        >
          <span className={`block h-full ${syncedLines === totalLines ? 'bg-foam' : 'bg-iris'}`} style={{ width: `${percent}%` }} />
        </span>
        {t('editor.statusBar.synced', { synced: syncedLines, total: totalLines, percent })}
      </Cell>
      {duration > 0 && (
        <Cell tip={t('editor.statusBar.coverageTip', { covered: formatTime(coveredSeconds), total: formatTime(duration) })}>
          {t('editor.statusBar.coverage', { percent: Math.round((coveredSeconds / duration) * 100) })}
        </Cell>
      )}
      <Cell>{t('editor.wordCount', { count: wordCount })}</Cell>
      <Cell tip={t('editor.statusBar.charsNoSpaces', { count: charCountNoSpaces })}>{t('editor.statusBar.chars', { count: charCount })}</Cell>
      {selectedCount > 0 && (
        <Cell><span className="text-primary-ink">{t('editor.selection.count', { count: selectedCount })}</span></Cell>
      )}
      <span className="ml-auto inline-flex h-full items-center border-l border-hl">
        <LastSaved key={lastSavedAt ?? 'none'} at={lastSavedAt} dirty={dirty} local={local} />
      </span>
      <span className="inline-flex h-full items-center px-2.5 font-semibold text-foreground">{format}</span>
    </footer>
  );
}

export default memo(EditorStatusBar);
