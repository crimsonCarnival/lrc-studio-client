import { useState } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import { toggleSingerAtCaret } from '../../utils/paste-toolbar';

interface RawLyricsSyntaxBarProps {
  value: string;
  onChange: (next: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Project singer roster: shown as chips, and the only names `Name:` prefixes recognize. */
  singers: string[];
}

/**
 * Shown under a raw lyrics textarea (setup + editor Raw Lyrics modal): singer chips that toggle
 * a singer on the line at the cursor (`Name: lyric` prefix, or the `[Section | Name]` roster on
 * a header line), and a collapsible "Formatting help" panel explaining the raw-text syntax with
 * the project's own singer names as examples.
 */
export default function RawLyricsSyntaxBar({ value, onChange, textareaRef, singers }: RawLyricsSyntaxBarProps) {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);

  const insertSinger = (name: string) => {
    const ta = textareaRef.current;
    const caret = ta ? ta.selectionStart : value.length;
    const next = toggleSingerAtCaret(value, caret, name, singers);
    onChange(next.value);
    // Restore focus + caret after React commits the new value.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.caret, next.caret);
    });
  };

  const a = singers[0] ?? t('editor.paste.help.singerA');
  const b = singers[1] ?? t('editor.paste.help.singerB');
  const chorus = t('editor.paste.help.chorus');
  const lyric = t('editor.paste.help.lyric');
  const examples: Array<{ code: string; desc: string }> = [
    { code: `[${chorus}]`, desc: t('editor.paste.help.section') },
    { code: `[${chorus} | ${a}, ${b}]`, desc: t('editor.paste.help.sectionSingers') },
    { code: '[]', desc: t('editor.paste.help.unlabeled') },
    { code: `${a}: ${lyric}`, desc: t('editor.paste.help.lineSinger') },
    { code: `${a} & ${b}: ${lyric}`, desc: t('editor.paste.help.lineSingers') },
    { code: `\\[${lyric}]`, desc: t('editor.paste.help.escape') },
  ];

  return (
    <div className="flex flex-col gap-1.5 shrink-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setHelpOpen((o) => !o)}
          aria-expanded={helpOpen}
          className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-medium text-zinc-400 hover:text-primary hover:bg-zinc-800/60 transition-colors"
        >
          <Icon name="help" size={13} />
          {t('editor.paste.help.toggle')}
          <Icon name={helpOpen ? 'expand_less' : 'expand_more'} size={13} />
        </button>
        {singers.length > 0 && (
          <>
            <span className="w-px h-4 bg-zinc-700/60 mx-0.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
              <Icon name="group" size={12} />
              {t('editor.paste.singerChips')}
            </span>
            {singers.map((name) => (
              <Tip key={name} content={t('editor.paste.singerChipTip', { name })}>
                <button
                  type="button"
                  // Keep the textarea focused so its caret is the insertion point.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertSinger(name)}
                  className="h-6 px-2.5 max-w-[160px] truncate rounded-full border border-zinc-700/60 bg-zinc-800 text-[11px] text-zinc-200 hover:border-primary/50 hover:text-primary transition-colors"
                >
                  {name}
                </button>
              </Tip>
            ))}
          </>
        )}
      </div>

      {helpOpen && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 text-[11px] text-zinc-400 flex flex-col gap-1.5 max-h-56 overflow-y-auto scrollbar-thin">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-baseline">
            {examples.map(({ code, desc }) => (
              <div key={code} className="contents">
                <dt><code className="font-mono text-zinc-200 bg-zinc-800/80 rounded px-1.5 py-px whitespace-nowrap">{code}</code></dt>
                <dd>{desc}</dd>
              </div>
            ))}
          </dl>
          <p className="flex items-start gap-1.5 text-warning">
            <Icon name="info" size={13} className="shrink-0 mt-px" />
            <span>
              {singers.length > 0
                ? t('editor.paste.help.rosterOnly', { names: singers.join(', ') })
                : t('editor.paste.help.rosterEmpty')}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
