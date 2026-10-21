import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/utils';
import { Icon } from './Icon';

type EmptyArt = 'song' | 'words' | 'lists' | 'search';

interface EmptyStateProps {
  /** Which drawing sits above the text. */
  art: EmptyArt;
  title: ReactNode;
  description?: ReactNode;
  /** For `words`: up to three real words, drawn as the blocks that are still to be timed. */
  words?: string[];
  /** Actions, usually one primary button and at most one quiet one. */
  children?: ReactNode;
  /** Draw the card around it. Off when the parent already is one. */
  card?: boolean;
  className?: string;
}

const DASHED = 'outline-[1.5px] -outline-offset-[1.5px] outline-dashed outline-hl';

/** A flat line where the waveform will be, with the playhead waiting on it. */
function SongArt() {
  return (
    <div className="relative flex h-16 w-[280px] max-w-full items-center justify-center overflow-hidden">
      <div className="flex items-center gap-[5px]">
        {Array.from({ length: 31 }, (_, i) => <i key={i} className="block size-1 rounded-[2px] bg-hl" />)}
      </div>
      <div className="empty-pulse absolute inset-y-1 left-1/2 -ml-px w-0.5 rounded-[2px] bg-foam" />
      <Icon name="music_note" size={22} className="absolute left-[calc(50%+10px)] top-0 text-primary-ink" />
    </div>
  );
}

/** Word blocks not placed yet, over an empty ruler. */
function WordsArt({ words }: { words: string[] }) {
  const ticks = [14, 8, 14, 8, 14, 8, 14];
  return (
    <div className="relative h-[68px] w-fit max-w-full">
      <div className="ml-[22px] flex gap-2 overflow-hidden">
        {[...words.slice(0, 3), '…'].map((word, i) => (
          <span key={i} className={`flex h-[38px] shrink-0 items-center whitespace-nowrap rounded-[10px] px-[13px] font-heading text-[19px] font-bold text-faint ${DASHED}`}>
            {word}
          </span>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-1.5 h-0.5 rounded-[2px] bg-hl" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-0.5">
        {ticks.map((h, i) => <span key={i} className="w-[1.5px] bg-hl" style={{ height: h }} />)}
      </div>
      <div className="empty-pulse absolute inset-y-0 left-2 w-0.5 rounded-[2px] bg-foam" />
    </div>
  );
}

/** A stack of lists that do not exist yet, with the one you could add on top. */
function ListsArt() {
  return (
    <div className="relative h-[76px] w-[200px]">
      <div className={`absolute left-[30px] top-0 h-6 w-[140px] rounded-lg ${DASHED}`} />
      <div className={`absolute left-[15px] top-4 h-7 w-[170px] rounded-[9px] bg-background ${DASHED}`} />
      <div className="empty-float absolute left-0 top-[34px] flex h-10 w-[200px] items-center gap-2.5 rounded-[10px] bg-raised px-3 inset-ring inset-ring-hl">
        <span className="grid size-[22px] place-items-center rounded-md bg-primary-soft text-primary-ink">
          <Icon name="add" size={14} />
        </span>
        <span className="h-1.5 w-[90px] rounded-[3px] bg-hl" />
      </div>
    </div>
  );
}

/** A magnifier that found only a faint signal. */
function SearchArt() {
  return (
    <div className="relative grid h-[76px] w-[120px] place-items-center">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-faint">
        <path d="M17 11a6 6 0 1 1-12 0a6 6 0 1 1 12 0 M15.5 15.5L20 20" />
      </svg>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-9 top-5 text-primary-ink">
        <path d="M3 12h1 M7 10v4 M11 8v8 M15 11v2" />
      </svg>
    </div>
  );
}

const NO_WORDS: string[] = [];

/**
 * An empty state (redesign sheet 11): a small drawing of what is missing, one sentence
 * saying so, one saying what to do, and the action.
 */
export function EmptyState({ art, title, description, words = NO_WORDS, children, card = true, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-[18px] text-center',
        card && 'rounded-[var(--radius-card)] bg-background p-7 inset-ring inset-ring-hl',
        className,
      )}
    >
      <div aria-hidden="true" className="max-w-full">
        {art === 'song' && <SongArt />}
        {art === 'words' && <WordsArt words={words} />}
        {art === 'lists' && <ListsArt />}
        {art === 'search' && <SearchArt />}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <p className="font-heading text-[22px] font-bold leading-tight tracking-[-0.02em] text-foreground">{title}</p>
        {description && <p className="max-w-[380px] text-base leading-[1.4] text-subtle text-pretty">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
