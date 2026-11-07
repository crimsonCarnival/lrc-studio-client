import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { useKeyboardInset } from '@/features/editor/hooks/useKeyboardInset';

export type SetupStep = 1 | 2 | 3;

type SetupStepperProps = {
  step: SetupStep;
  onStepChange: (step: SetupStep) => void;
  /** Which of the three Start-syncing requirements are met (the same flags SetupScreen's rule uses). */
  done: { identity: boolean; audio: boolean; lyrics: boolean };
  onStart: () => void;
  onFocusName: () => void;
  notice: ReactNode;
  song: ReactNode;
  audio: ReactNode;
  lyrics: ReactNode;
};

const STEPS: SetupStep[] = [1, 2, 3];
const STEP_KEYS = { 1: 'setup.stepSong', 2: 'setup.stepAudio', 3: 'setup.stepLyrics' } as const;
const DONE_KEY = { 1: 'identity', 2: 'audio', 3: 'lyrics' } as const;
// Typed i18next rejects computed keys.
type TkFn = (k: string) => string;

/**
 * Phone arrangement of the setup screen: a step bar, the body of the current step and a sticky
 * footer. It owns no data; the three panels come from SetupScreen, so the fields, the picked
 * media and the pasted lyrics are the same state whichever step is showing. A step mounts the
 * first time it is visited and is then only hidden, so search results and open sections survive
 * moving back and forth.
 */
export default function SetupStepper({ step, onStepChange, done, onStart, onFocusName, notice, song, audio, lyrics }: SetupStepperProps) {
  const { t } = useTranslation();
  const keyboard = useKeyboardInset();
  const [visited, setVisited] = useState<ReadonlySet<SetupStep>>(() => new Set([step]));
  if (!visited.has(step)) setVisited(new Set(visited).add(step));

  const headings = useRef<Partial<Record<SetupStep, HTMLHeadingElement | null>>>({});
  const tabs = useRef<Partial<Record<SetupStep, HTMLButtonElement | null>>>({});
  const bodyRef = useRef<HTMLDivElement>(null);
  const skipFocus = useRef(true);
  const focusName = useRef(false);

  // Focus follows the step so a screen reader announces where it landed; a jump to the name
  // field focuses that field instead.
  useEffect(() => {
    if (skipFocus.current) { skipFocus.current = false; return; }
    if (focusName.current) { focusName.current = false; onFocusName(); return; }
    headings.current[step]?.focus({ preventScroll: true });
    bodyRef.current?.scrollTo?.({ top: 0 });
  }, [step, onFocusName]);

  // A focused field must not end up behind the keyboard.
  const reveal = (e: { target: EventTarget }) => {
    const el = e.target as HTMLElement;
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    window.setTimeout(() => el.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 250);
  };

  const missing = !done.identity ? 'identity' : !done.audio ? 'audio' : !done.lyrics ? 'lyrics' : null;
  const missingStep: SetupStep | null = missing === 'identity' ? 1 : missing === 'audio' ? 2 : missing === 'lyrics' ? 3 : null;
  const message = missing === 'identity' ? t('setup.stepNeedIdentity')
    : missing === 'audio' ? t('setup.stepNeedAudio')
    : missing === 'lyrics' ? t('setup.stepNeedLyrics')
    : t('setup.stepReady');

  const jumpToMissing = () => {
    if (!missingStep) return;
    if (missing === 'identity') {
      if (step === 1) onFocusName();
      else focusName.current = true;
    }
    onStepChange(missingStep);
  };

  const onTabKeys = (e: KeyboardEvent) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    const next = (step + delta) as SetupStep;
    if (next < 1 || next > 3) return;
    e.preventDefault();
    onStepChange(next);
    tabs.current[next]?.focus();
  };

  const panels: Record<SetupStep, ReactNode> = {
    1: <div className="glass rounded-2xl flex flex-col p-4 gap-3">{song}</div>,
    2: <div className="glass rounded-2xl flex flex-col p-3 gap-3 h-full min-h-72">{notice}{audio}</div>,
    3: <div className="glass rounded-2xl flex flex-col p-3 gap-3 h-full min-h-72">{lyrics}</div>,
  };

  return (
    <div
      data-setup-stepper
      className="flex flex-col h-full max-h-[100dvh] overflow-hidden"
      style={keyboard ? { paddingBottom: keyboard } : undefined}
      onFocus={reveal}
    >
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center justify-between gap-3">
        <h1 className="font-heading text-zinc-100 text-lg min-w-0 truncate">{t('setup.newProjectTitle')}</h1>
        {/* Every new project starts private; publishing is a later, explicit step. */}
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 select-none shrink-0">
          <Icon name="lock" size={14} />
          <span>{t('setup.private')}</span>
        </div>
      </div>

      <div role="tablist" aria-label={t('setup.stepsLabel')} onKeyDown={onTabKeys} className="shrink-0 px-4 pb-2 grid grid-cols-3 gap-1.5">
        {STEPS.map((n) => {
          const active = step === n;
          const complete = done[DONE_KEY[n]];
          return (
            <button
              key={n}
              ref={(el) => { tabs.current[n] = el; }}
              type="button"
              role="tab"
              id={`setup-tab-${n}`}
              aria-selected={active}
              aria-current={active ? 'step' : undefined}
              aria-controls={`setup-panel-${n}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onStepChange(n)}
              className={`min-h-11 rounded-xl px-2 flex items-center justify-center gap-1.5 text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-zinc-900/60 border-zinc-800/60 text-zinc-400'
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-5 shrink-0 rounded-full flex items-center justify-center text-[10px] ${
                  complete && !active ? 'bg-green-500/15 text-green-400' : active ? 'bg-primary text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {complete && !active ? <Icon name="check" size={12} /> : n}
              </span>
              <span className="truncate">{(t as TkFn)(STEP_KEYS[n])}</span>
              {complete && !active && <span className="sr-only">{t('setup.stepDone')}</span>}
            </button>
          );
        })}
      </div>

      <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-3">
        {STEPS.map((n) => (
          <section
            key={n}
            role="tabpanel"
            id={`setup-panel-${n}`}
            aria-labelledby={`setup-heading-${n}`}
            hidden={step !== n}
            className={n === 1 ? 'flex flex-col gap-2' : 'h-full flex flex-col gap-2'}
          >
            <h2
              id={`setup-heading-${n}`}
              ref={(el) => { headings.current[n] = el; }}
              tabIndex={-1}
              className="sr-only"
            >
              {(t as TkFn)(STEP_KEYS[n])}
            </h2>
            {visited.has(n) && panels[n]}
          </section>
        ))}
      </div>

      <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-950/95 px-4 pt-2.5 flex items-center gap-3"
        style={{ paddingBottom: keyboard ? '0.625rem' : 'max(0.625rem, env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          id="setup-footer-message"
          onClick={jumpToMissing}
          disabled={!missingStep}
          className={`flex-1 min-w-0 min-h-11 text-left text-xs leading-snug rounded-lg ${missingStep ? 'text-zinc-300 underline underline-offset-2 decoration-zinc-600' : 'text-zinc-400'}`}
        >
          {message}
        </button>
        {step < 3 ? (
          <Button
            type="button"
            onClick={() => onStepChange((step + 1) as SetupStep)}
            className="h-11 px-5 shrink-0 bg-primary hover:bg-primary-dim text-zinc-950 font-bold rounded-xl gap-2 text-sm"
          >
            {t('setup.stepContinue')}
            <Icon name="arrow_forward" size={14} />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onStart}
            disabled={!!missing}
            aria-describedby="setup-footer-message"
            className="h-11 px-5 shrink-0 bg-primary hover:bg-primary-dim text-zinc-950 font-bold rounded-xl gap-2 text-sm disabled:shadow-none"
          >
            {t('setup.stepStart')}
          </Button>
        )}
      </div>
    </div>
  );
}
