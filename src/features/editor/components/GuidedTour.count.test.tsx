import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';

const updateSetting = vi.fn();
vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ settings: { interface: { editorTourShown: 0, editorTourEnabled: true } }, updateSetting }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

import { useEffect } from 'react';
import { GuidedTour } from './GuidedTour';
import { useGuidedTour } from '../hooks/useGuidedTour';
import { markNewProject, consumeNewProject } from '../tour/tour-launch';
import type { TourStep } from '../tour/tour-steps';

const steps: TourStep[] = [{ id: 'a', target: 'tour-a', titleKey: 'a.title', bodyKey: 'a.body', guideAnchor: 'x' }];

// The real hook and the real component together, as AppLayout wires them.
function Harness({ mode }: { mode: 'auto' | 'manual' }) {
  const tour = useGuidedTour();
  const { start, maybeStartForNewProject } = tour;
  useEffect(() => { if (mode === 'auto') maybeStartForNewProject(); else start(); }, [mode, start, maybeStartForNewProject]);
  return <GuidedTour steps={steps} isOpen={tour.isOpen} offerOptOut={tour.offerOptOut} narrow={false} onClose={tour.close} onLearnMore={vi.fn()} onShown={tour.onShown} />;
}

beforeEach(() => {
  updateSetting.mockClear();
  consumeNewProject();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getBoundingClientRect = () => ({ top: 10, left: 10, width: 50, height: 20, right: 60, bottom: 30, x: 10, y: 10, toJSON: () => ({}) });
});
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('tour showing count', () => {
  it('does not count an automatic showing whose targets never appear', () => {
    vi.useFakeTimers();
    markNewProject();
    render(<Harness mode="auto" />);
    act(() => { vi.advanceTimersByTime(5100); });
    expect(updateSetting).not.toHaveBeenCalled();
  });

  it('counts an automatic showing once its target mounts late', async () => {
    markNewProject();
    render(<Harness mode="auto" />);
    expect(updateSetting).not.toHaveBeenCalled();
    const el = document.createElement('div');
    el.setAttribute('data-tour', 'tour-a');
    await act(async () => { document.body.appendChild(el); await Promise.resolve(); });
    expect(updateSetting).toHaveBeenCalledTimes(1);
    expect(updateSetting).toHaveBeenCalledWith('interface.editorTourShown', 1);
  });

  it('never counts a manual start', () => {
    const el = document.createElement('div');
    el.setAttribute('data-tour', 'tour-a');
    document.body.appendChild(el);
    render(<Harness mode="manual" />);
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    expect(updateSetting).not.toHaveBeenCalled();
  });
});
