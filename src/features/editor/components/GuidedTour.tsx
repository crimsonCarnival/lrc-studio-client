import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import type { TourStep } from '../tour/tourSteps';

const PADDING = 8;
const CARD_WIDTH = 320;
const CARD_GAP = 16;

interface Rect { top: number; left: number; width: number; height: number }

function measure(target: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function GuidedTour({ steps, isOpen, onClose }: { steps: TourStep[]; isOpen: boolean; onClose: () => void }) {
  const { t: tRaw } = useTranslation();
  // Step title/body keys are dynamic; bypass strict key checking.
  const t = tRaw as (key: string, options?: object) => string;
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const skippedCountRef = useRef(0);

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
      if (skippedCountRef.current >= steps.length) { onClose(); return; }
      if (stepIndex + 1 < steps.length) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStepIndex(stepIndex + 1);
      } else {
        onClose();
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !step || !rect) return null;

  const isLast = stepIndex === steps.length - 1;
  const spot = {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  const spaceBelow = window.innerHeight - (spot.top + spot.height);
  const placeBelow = spaceBelow > 160 || spaceBelow > spot.top;
  const cardTop = placeBelow ? spot.top + spot.height + CARD_GAP : Math.max(CARD_GAP, spot.top - CARD_GAP - 160);
  const cardLeft = Math.min(Math.max(spot.left, CARD_GAP), window.innerWidth - CARD_WIDTH - CARD_GAP);

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
        aria-label={t('editor.tour.skip')}
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={onClose}
      />

      {/* Tooltip card */}
      <div
        className="fixed bg-zinc-900 border border-zinc-700 shadow-elevated rounded-xl p-4 flex flex-col gap-3 animate-fade-in"
        style={{ top: cardTop, left: cardLeft, width: CARD_WIDTH }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-100">{t(step.titleKey)}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('editor.tour.skip')}
            className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{t(step.bodyKey)}</p>

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
              onClick={() => (isLast ? onClose() : setStepIndex(i => i + 1))}
            >
              {isLast ? t('editor.tour.done') : t('editor.tour.next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
