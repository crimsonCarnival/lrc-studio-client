import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import LandingWordsDemo from './LandingWordsDemo';

const WORDS = 9; // 6 English words + 3 Japanese words across the two sample lines.
const litCount = (container: HTMLElement) => container.querySelectorAll('.glow-line').length;

afterEach(() => { vi.useRealTimers(); });

describe('LandingWordsDemo', () => {
  it('stamps every word of every line, then stops', () => {
    vi.useFakeTimers();
    const { container } = render(<LandingWordsDemo reducedMotion={false} />);
    expect(litCount(container)).toBe(0);

    // Each stamp schedules the next once it renders, so step one tick per act.
    const step = (n: number) => { for (let i = 0; i < n; i++) act(() => { vi.advanceTimersByTime(420); }); };
    step(3);
    expect(litCount(container)).toBe(3);

    // Through the end of the second line, and well past it.
    step(WORDS + 5);
    expect(litCount(container)).toBe(WORDS);
    const lines = container.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    lines.forEach((p) => expect(p.querySelectorAll('span:not(.glow-line)')).toHaveLength(0));
  });

  it('renders fully stamped with reduced motion', () => {
    const { container } = render(<LandingWordsDemo reducedMotion />);
    expect(litCount(container)).toBe(WORDS);
  });
});
