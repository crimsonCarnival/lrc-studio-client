import { useTranslation } from 'react-i18next';
import { Kbd } from '@ui/kbd';
import { Tip } from '@ui/tip';
import { useSettings } from '@/features/settings/useSettings';
import type { EditorLine } from '@/features/editor/editor.types';
import { WordRuby } from './WordsFocus';

interface TapPadProps {
  line: EditorLine | undefined;
  /** The word the next mark stamps, or -1 once the line is done. */
  activeWordIndex: number;
  /** The mark shortcut as a key cap. */
  markKey: string;
  onMark: () => void;
}

/**
 * The words-mode stamp button. It always has the same size and sits in the same place (in the
 * player, which is where the eyes and the pointer already are), so someone stamping by clicking
 * can leave the pointer on it for a whole line. It never takes the keyboard focus either: a
 * focused button would turn Enter or Space into a second stamp, and arrow keys into nothing.
 */
export function TapPad({ line, activeWordIndex, markKey, onMark }: TapPadProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const words = line?.words ?? [];
  const lineStarted = line?.timestamp != null;
  const next = lineStarted && activeWordIndex >= 0 ? words[activeWordIndex] : undefined;
  const done = lineStarted && words.length > 0 && !next;
  const stamped = words.filter((w) => w.time != null).length;
  // A new key every stamp restarts the pulse, so each click is felt.
  const pulseKey = `${line?.id ?? ''}:${stamped}:${line?.timestamp ?? ''}`;

  return (
    <Tip content={t('editor.words.tapTip', { key: markKey })}>
      <button
        type="button"
        data-tour="words-tap-pad"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onMark}
        disabled={!line || line.type === 'section'}
        className="group relative flex h-11 w-[300px] shrink-0 items-center gap-3 overflow-hidden rounded-xl bg-primary px-3.5 text-left text-zinc-950 shadow-sm shadow-primary/20 transition-[transform,background-color] hover:bg-primary-dim active:translate-y-px disabled:opacity-50"
      >
        <span key={pulseKey} aria-hidden className={`absolute inset-0 rounded-xl ${stamped > 0 || lineStarted ? 'animate-tap-flash' : ''}`} />
        <span className="relative text-[11px] font-extrabold tracking-[0.1em] uppercase">{t('editor.words.tapMark')}</span>
        <span className={`relative min-w-0 flex-1 truncate font-heading text-base leading-[1.3] font-bold ${next?.reading ? 'pt-2.5' : ''}`}>
          {!lineStarted
            ? t('editor.words.tapLineStart')
            : done
              ? t('editor.words.tapDone')
              : next && <WordRuby word={next.word ?? ''} reading={next.reading} format={settings.editor?.display?.readingFormat} />}
        </span>
        {words.length > 0 && (
          <span className="relative font-mono text-[11px] tabular-nums">{Math.min(stamped + (done ? 0 : 1), words.length)}/{words.length}</span>
        )}
        <Kbd className="relative border-zinc-950/40 bg-transparent text-zinc-950">{markKey}</Kbd>
      </button>
    </Tip>
  );
}
