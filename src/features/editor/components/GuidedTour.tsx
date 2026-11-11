import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import { placeCard } from '../tour/tour-placement';
import type { TourStep } from '../tour/tour-steps';
import { Tip } from '@ui/tip';

const PADDING = 8;

interface Rect { top: number; left: number; width: number; height: number }

function measure(target: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

type GuidedTourProps = {
  steps: TourStep[];
  isOpen: boolean;
  offerOptOut: boolean;
  narrow: boolean;
  onClose: (optOut: boolean) => void;
  onLearnMore: (anchor: string) => void;
};

export function GuidedTour({ steps, isOpen, offerOptOut, narrow, onClose, onLearnMore }: GuidedTourProps) {
  const { t: tRaw } = useTranslation();
  // Step title/body keys are dynamic; bypass strict key checking.
  const t = tRaw as (key: string, options?: object) => string;
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [optOut, setOptOut] = useState(false);
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const skippedCountRef = useRef(0);
  const closeTour = useCallback(() => onClose(optOut), [onClose, optOut]);

  const step = steps[stepIndex];

  const recalc = useCallback(() => {
    if (!step) return;
    setRect(measure(step.target));
  }, [step]);

  // Reset to the first step whenever the tour (re)opens.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex(0);
      setOptOut(false);
      skippedCountRef.current = 0;
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      // Target not mounted (e.g. no sections yet) — skip this step rather than
      // stall the tour. Bail out entirely if every step is unavailable.
      skippedCountRef.current += 1;
      if (skippedCountRef.current >= steps.length) { closeTour(); return; }
      if (stepIndex + 1 < steps.length) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStepIndex(stepIndex + 1);
      } else {
        closeTour();
      }
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    recalc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stepIndex, step]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [isOpen, recalc]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTour(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeTour]);

  // Measure the card so placement knows its real height; re-run when its content changes.
  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [stepIndex, rect, offerOptOut, narrow]);

  if (!isOpen || !step || !rect) return null;

  const isLast = stepIndex === steps.length - 1;
  const spot = {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  const card = placeCard(spot, cardHeight ?? 0, { width: window.innerWidth, height: window.innerHeight }, narrow);

  return (
    <div className="fixed inset-0 z-overlay" role="dialog" aria-modal="true" aria-label={t(step.titleKey)}>
      {/* Spotlight cutout */}
      <div
        className="fixed rounded-xl border-2 border-primary/70 transition-all duration-300 ease-out pointer-events-none"
        style={{ ...spot, boxShadow: '0 0 0 9999px rgba(9,9,11,0.78)' }}
      />

      {/* Click outside the card to dismiss */}
      <button
        type="button"
        data-testid="tour-overlay"
        aria-label={t('editor.tour.skip')}
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={closeTour}
      />

      {/* Tooltip card */}
      <div
        ref={cardRef}
        className="fixed bg-zinc-900 border border-zinc-700 shadow-elevated rounded-xl p-4 flex flex-col gap-3 animate-fade-in"
        style={{ ...card, visibility: cardHeight === null ? 'hidden' : 'visible' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-100">{t(step.titleKey)}</h3>
          <Tip content={t('editor.tour.skip')}>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={closeTour}
              aria-label={t('editor.tour.skip')}
            >
              <Icon name="close" size={16} />
            </Button>
          </Tip>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{t(step.bodyKey)}</p>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 self-start text-xs"
          onClick={() => onLearnMore(step.guideAnchor)}
        >
          {t('editor.tour.learnMore')}
        </Button>
        {offerOptOut && (
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <Checkbox
              checked={optOut}
              onCheckedChange={(v) => setOptOut(v === true)}
              aria-label={t('editor.tour.dontShowAgain')}
            />
            {t('editor.tour.dontShowAgain')}
          </label>
        )}

        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-[11px] text-zinc-600 tabular-nums">
            {t('editor.tour.stepOf', { current: stepIndex + 1, total: steps.length })}
          </span>
          <div className="flex items-center gap-1.5">
            {stepIndex > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs text-zinc-400 hover:text-zinc-200" onClick={() => setStepIndex(i => i - 1)}>
                {t('editor.tour.back')}
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 px-3 text-xs font-semibold text-zinc-950 bg-primary hover:bg-primary/90"
              onClick={() => (isLast ? closeTour() : setStepIndex(i => i + 1))}
            >
              {isLast ? t('editor.tour.done') : t('editor.tour.next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
