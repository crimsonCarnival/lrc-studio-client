// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtistText } from './ArtistText';

const c = (name: string, role: 'primary' | 'featured', order: number) => ({ name, role, order });

describe('ArtistText', () => {
  it('shows primaries as they are and the featured names quieter after feat.', () => {
    render(<ArtistText metadata={{ artists: [c('Drake', 'primary', 0), c('Rihanna', 'featured', 1), c('Kanye', 'featured', 2)] }} />);
    const full = screen.getByTitle('Drake feat. Rihanna & Kanye');
    expect(full).toHaveTextContent('Drake feat. Rihanna & Kanye');
    expect(screen.getByText('feat. Rihanna & Kanye')).toHaveClass('text-subtle');
    expect(screen.getByText('feat. Rihanna & Kanye')).not.toBe(full);
  });

  it('shows primaries with the shared joins', () => {
    render(<ArtistText metadata={{ artists: [c('A', 'primary', 0), c('B', 'primary', 1), c('C', 'primary', 2)] }} />);
    expect(screen.getByTitle('A, B & C')).toHaveTextContent('A, B & C');
  });

  it('shows a featured-only song', () => {
    render(<ArtistText metadata={{ artists: [c('Rihanna', 'featured', 0)] }} />);
    expect(screen.getByTitle('feat. Rihanna')).toHaveTextContent('feat. Rihanna');
  });

  it('falls back to the stored text for a legacy row without credits', () => {
    render(<ArtistText metadata={{ artists: [], songArtist: 'Old Band' }} />);
    expect(screen.getByTitle('Old Band')).toHaveTextContent('Old Band');
  });

  it('shows the fallback when there are no artists at all, and nothing without one', () => {
    const { container, rerender } = render(<ArtistText metadata={{ artists: [] }} fallback="No artist" />);
    expect(container).toHaveTextContent('No artist');
    rerender(<ArtistText metadata={{ artists: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
