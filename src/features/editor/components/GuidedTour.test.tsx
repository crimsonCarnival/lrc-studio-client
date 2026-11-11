import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

import { GuidedTour } from './GuidedTour';
import type { TourStep } from '../tour/tour-steps';

const steps: TourStep[] = [
  { id: 'a', target: 'tour-a', titleKey: 'a.title', bodyKey: 'a.body', guideAnchor: 'anchor-a' },
];

function setup(props: Partial<React.ComponentProps<typeof GuidedTour>> = {}) {
  const onClose = vi.fn();
  const onLearnMore = vi.fn();
  const onTargetClick = vi.fn();
  render(
    <>
      <button data-tour="tour-a" onClick={onTargetClick}>target</button>
      <GuidedTour steps={steps} isOpen offerOptOut={false} narrow={false} onClose={onClose} onLearnMore={onLearnMore} {...props} />
    </>,
  );
  return { onClose, onLearnMore, onTargetClick };
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getBoundingClientRect = function () {
    return { top: 100, left: 100, width: 100, height: 40, right: 200, bottom: 140, x: 100, y: 100, toJSON: () => ({}) };
  };
});

describe('GuidedTour', () => {
  it('has no checkbox when opt-out is not offered', () => {
    setup();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('shows the checkbox when opt-out is offered', () => {
    setup({ offerOptOut: true });
    expect(screen.getByRole('checkbox', { name: 'editor.tour.dontShowAgain' })).toBeInTheDocument();
  });

  it('passes the checkbox state to onClose on Done', () => {
    const { onClose } = setup({ offerOptOut: true });
    fireEvent.click(screen.getByRole('checkbox', { name: 'editor.tour.dontShowAgain' }));
    fireEvent.click(screen.getByRole('button', { name: 'editor.tour.done' }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('Esc without checking closes with false', () => {
    const { onClose } = setup({ offerOptOut: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('Learn more passes the step anchor', () => {
    const { onLearnMore } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'editor.tour.learnMore' }));
    expect(onLearnMore).toHaveBeenCalledWith('anchor-a');
  });

  it('clicking the spotlighted target does not reach the target', () => {
    const { onTargetClick } = setup();
    const overlay = screen.getByTestId('tour-overlay');
    fireEvent.click(overlay);
    expect(onTargetClick).not.toHaveBeenCalled();
    // jsdom has no hit testing: assert the overlay is a full-screen layer above the target.
    expect(overlay.className).toContain('inset-0');
  });
});
