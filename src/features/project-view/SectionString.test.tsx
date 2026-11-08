// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SectionString } from './SectionString';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const segments = [
  { label: 'Verse one', start: 0, end: 10 },
  { label: 'Chorus one', start: 10, end: 40 },
];

function setup(currentTime = 5, extra: { ready?: boolean; duration?: number; segs?: typeof segments } = {}) {
  const onSeek = vi.fn();
  render(
    <SectionString
      segments={extra.segs ?? segments}
      currentTime={currentTime}
      duration={extra.duration ?? 40}
      ready={extra.ready ?? true}
      onSeek={onSeek}
    />,
  );
  const slider = screen.getByRole('slider');
  // jsdom has no layout: give the strip a 400px box starting at x=0.
  slider.getBoundingClientRect = () => ({ left: 0, width: 400, top: 0, height: 6, right: 400, bottom: 6, x: 0, y: 0, toJSON: () => ({}) });
  return { onSeek, slider };
}

describe('SectionString', () => {
  it('renders one segment per section with widths proportional to duration', () => {
    setup();
    const parts = document.querySelectorAll<HTMLElement>('[data-segment]');
    expect(parts).toHaveLength(2);
    expect(parts[0].style.flexGrow).toBe('10');
    expect(parts[1].style.flexGrow).toBe('30');
  });

  it('shows elapsed, the current section name and total on one row', () => {
    setup(12);
    expect(screen.getByText('0:12')).toBeInTheDocument();
    expect(screen.getByText('Chorus one')).toBeInTheDocument();
    expect(screen.getByText('0:40')).toBeInTheDocument();
    expect(screen.queryByText('Verse one')).toBeNull();
  });

  it('fills the played part and places the thumb from currentTime', () => {
    setup(20);
    const fills = [...document.querySelectorAll<HTMLElement>('[data-segment] > span')].map((e) => parseFloat(e.style.width));
    expect(fills[0]).toBe(100);
    expect(fills[1]).toBeCloseTo(33.33, 1);
    expect((document.querySelector('[data-thumb]') as HTMLElement).style.left).toBe('50%');
  });

  it('exposes slider semantics with the section in the value text', () => {
    const { slider } = setup(12);
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '40');
    expect(slider).toHaveAttribute('aria-valuenow', '12');
    expect(slider).toHaveAttribute('aria-valuetext', 'Chorus one, 0:12 / 0:40');
    expect(slider).toHaveAttribute('aria-label', 'player.seekPlayback');
    expect(slider.style.touchAction).toBe('none');
  });

  it('seeks proportionally on pointer down and while dragging', () => {
    const { slider, onSeek } = setup();
    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 1 });
    expect(onSeek).toHaveBeenLastCalledWith(20);
    fireEvent.pointerMove(slider, { clientX: 300, pointerId: 1 });
    expect(onSeek).toHaveBeenLastCalledWith(30);
    fireEvent.pointerUp(slider, { pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 100, pointerId: 1 });
    expect(onSeek).toHaveBeenCalledTimes(2);
  });

  it('clamps pointer positions to the strip', () => {
    const { slider, onSeek } = setup();
    fireEvent.pointerDown(slider, { clientX: 900, pointerId: 1 });
    expect(onSeek).toHaveBeenLastCalledWith(40);
    fireEvent.pointerMove(slider, { clientX: -50, pointerId: 1 });
    expect(onSeek).toHaveBeenLastCalledWith(0);
  });

  it('seeks 5s with the arrows and jumps with Home and End', () => {
    const { slider, onSeek } = setup(12);
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onSeek).toHaveBeenLastCalledWith(17);
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onSeek).toHaveBeenLastCalledWith(7);
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onSeek).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onSeek).toHaveBeenLastCalledWith(40);
  });

  it('is inert without a duration or media', () => {
    const { slider, onSeek } = setup(0, { duration: 0, segs: [] });
    expect(slider).toHaveAttribute('aria-disabled', 'true');
    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 1 });
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onSeek).not.toHaveBeenCalled();
    expect(document.querySelector('[data-segment]')).toBeNull();
    expect(document.querySelector('[data-thumb]')).toBeNull();
  });
});
