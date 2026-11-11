import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

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

  it('Learn more passes the step anchor and the ticked opt-out', () => {
    const { onLearnMore } = setup({ offerOptOut: true });
    fireEvent.click(screen.getByRole('checkbox', { name: 'editor.tour.dontShowAgain' }));
    fireEvent.click(screen.getByRole('button', { name: 'editor.tour.learnMore' }));
    expect(onLearnMore).toHaveBeenCalledWith('anchor-a', true);
  });

  it('Learn more without the box ticked passes opt-out false', () => {
    const { onLearnMore } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'editor.tour.learnMore' }));
    expect(onLearnMore).toHaveBeenCalledWith('anchor-a', false);
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

describe('GuidedTour start and reopen', () => {
  const two: TourStep[] = [
    { id: 'a', target: 'tour-a', titleKey: 'a.title', bodyKey: 'a.body', guideAnchor: 'anchor-a' },
    { id: 'b', target: 'tour-b', titleKey: 'b.title', bodyKey: 'b.body', guideAnchor: 'anchor-b' },
  ];
  const props = (over: Partial<React.ComponentProps<typeof GuidedTour>> = {}) => ({
    steps: two, isOpen: true, offerOptOut: false, narrow: false, onClose: vi.fn(), onLearnMore: vi.fn(), ...over,
  });

  it('waits for a target that mounts late instead of skipping every step, and reports one showing', async () => {
    const onShown = vi.fn();
    render(<GuidedTour {...props({ onShown })} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    const el = document.createElement('button');
    el.setAttribute('data-tour', 'tour-b');
    await act(async () => { document.body.appendChild(el); await Promise.resolve(); });
    // Starts at the first AVAILABLE step (b), and the card is its own.
    expect(await screen.findByRole('dialog', { name: 'b.title' })).toBeInTheDocument();
    expect(onShown).toHaveBeenCalledTimes(1);
    el.remove();
  });

  it('closes without a showing when no target appears within 5 s', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const onShown = vi.fn();
    render(<GuidedTour {...props({ onClose, onShown })} />);
    act(() => { vi.advanceTimersByTime(4900); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(onClose).toHaveBeenCalledWith(false);
    expect(onShown).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('reopens at step 1 after finishing on a last step whose target is missing', () => {
    const a = document.createElement('button');
    a.setAttribute('data-tour', 'tour-a');
    document.body.appendChild(a);
    const onShown = vi.fn();
    const view = render(<GuidedTour {...props({ onShown, onClose: () => view.rerender(<GuidedTour {...props({ onShown, isOpen: false })} />) })} />);
    expect(screen.getByText('editor.tour.stepOf')).toBeInTheDocument();
    // Step b is missing: Next runs off the end and closes.
    fireEvent.click(screen.getByRole('button', { name: 'editor.tour.next' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    view.rerender(<GuidedTour {...props({ onShown })} />);
    expect(screen.getByRole('dialog', { name: 'a.title' })).toBeInTheDocument();
    expect(onShown).toHaveBeenCalledTimes(2);
    a.remove();
  });
});
