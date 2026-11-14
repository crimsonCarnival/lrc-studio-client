import { memo } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Tip } from '@ui/tip';

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
      <Cell>{t('editor.wordCount', { count: wordCount })}</Cell>
      <Cell tip={t('editor.statusBar.charsNoSpaces', { count: charCountNoSpaces })}>{t('editor.statusBar.chars', { count: charCount })}</Cell>
      {selectedCount > 0 && (
        <Cell><span className="text-primary-ink">{t('editor.selection.count', { count: selectedCount })}</span></Cell>
      )}
      <span className="ml-auto inline-flex h-full items-center border-l border-hl px-2.5 font-semibold text-foreground">{format}</span>
    </footer>
  );
}

export default memo(EditorStatusBar);
