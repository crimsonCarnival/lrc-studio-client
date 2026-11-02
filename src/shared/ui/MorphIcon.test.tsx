import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MorphIcon } from './MorphIcon';
import { MORPH_ICONS } from './morph-icons';

describe('MORPH_ICONS', () => {
  it('sends solid shapes as filled IconNodes and stroked ones as d strings', () => {
    expect(Array.isArray(MORPH_ICONS.play_arrow)).toBe(true);
    expect(typeof MORPH_ICONS.pause).toBe('string');
  });
});

describe('MorphIcon', () => {
  it('exposes a labelled icon as an image', () => {
    const { container } = render(<MorphIcon name="pause" label="Pause" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.textContent).toContain('Pause');
    expect(svg.classList.contains('app-icon')).toBe(true);
  });

  it('hides a decorative icon from assistive tech', () => {
    const { container } = render(<MorphIcon name="play_arrow" decorative />);
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('re-renders with a new icon without throwing', () => {
    const { rerender, container } = render(<MorphIcon name="play_arrow" decorative />);
    rerender(<MorphIcon name="pause" decorative />);
    expect(container.querySelector('svg')!.getAttribute('data-icon')).toBe('pause');
  });
});
