// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtistText } from './ArtistText';

const c = (name: string, role: 'primary' | 'featured', order: number) => ({ name, role, order });

describe('ArtistText', () => {
  // The full text sits in one element (the custom tooltip's trigger, for truncated rows) and
  // there is no native title on it any more.
  const fullText = (container: HTMLElement, text: string) => {
    const shown = container.firstElementChild as HTMLElement;
    expect(shown).toHaveTextContent(text);
    expect(shown).not.toHaveAttribute('title');
    return shown;
  };

  it('shows primaries as they are and the featured names quieter after feat.', () => {
    const { container } = render(<ArtistText metadata={{ artists: [c('Drake', 'primary', 0), c('Rihanna', 'featured', 1), c('Kanye', 'featured', 2)] }} />);
    const full = fullText(container, 'Drake feat. Rihanna & Kanye');
    expect(screen.getByText('feat. Rihanna & Kanye')).toHaveClass('text-subtle');
    expect(screen.getByText('feat. Rihanna & Kanye')).not.toBe(full);
  });

  it('shows primaries with the shared joins', () => {
    const { container } = render(<ArtistText metadata={{ artists: [c('A', 'primary', 0), c('B', 'primary', 1), c('C', 'primary', 2)] }} />);
    expect(fullText(container, 'A, B & C')).toHaveTextContent('A, B & C');
  });

  it('shows a featured-only song', () => {
    const { container } = render(<ArtistText metadata={{ artists: [c('Rihanna', 'featured', 0)] }} />);
    expect(fullText(container, 'feat. Rihanna')).toHaveTextContent('feat. Rihanna');
  });

  it('falls back to the stored text for a legacy row without credits', () => {
    const { container } = render(<ArtistText metadata={{ artists: [], songArtist: 'Old Band' }} />);
    expect(fullText(container, 'Old Band')).toHaveTextContent('Old Band');
  });

  it('shows the fallback when there are no artists at all, and nothing without one', () => {
    const { container, rerender } = render(<ArtistText metadata={{ artists: [] }} fallback="No artist" />);
    expect(container).toHaveTextContent('No artist');
    rerender(<ArtistText metadata={{ artists: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
