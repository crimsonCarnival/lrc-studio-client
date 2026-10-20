import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import InstrumentalDots from './InstrumentalDots';

const fills = (container: HTMLElement) =>
  [...container.firstElementChild!.children].map((dot) => (dot.firstElementChild as HTMLElement).style.opacity);

describe('InstrumentalDots', () => {
  it('fills left to right, the current dot by its fraction', () => {
    const { container } = render(<InstrumentalDots progress={0.5} dotCount={4} />);
    expect(fills(container)).toEqual(['1', '1', '0', '0']);
    const { container: c2 } = render(<InstrumentalDots progress={0.375} dotCount={4} />);
    expect(fills(c2)).toEqual(['1', '0.5', '0', '0']);
  });

  // Every dot keeps one structure as it fills, so starting a dot only animates
  // its fill's opacity up from 0 instead of swapping to a full-colour style.
  it('keeps the same element and dim base when a dot starts filling', () => {
    const { container, rerender } = render(<InstrumentalDots progress={0.3} dotCount={3} dimColor="red" />);
    const second = container.firstElementChild!.children[1] as HTMLElement;
    rerender(<InstrumentalDots progress={0.34} dotCount={3} dimColor="red" />);
    expect(container.firstElementChild!.children[1]).toBe(second);
    expect(second.style.background).toBe('red');
    expect(Number((second.firstElementChild as HTMLElement).style.opacity)).toBeLessThan(0.1);
  });
});
