// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LibrarySwitch } from './LibrarySwitch';

describe('LibrarySwitch', () => {
  it('marks playlists current', () => {
    render(<MemoryRouter><LibrarySwitch active="playlists" /></MemoryRouter>);
    const link = screen.getByRole('link', { name: 'Playlists' });
    expect(link).toHaveAttribute('href', '/library/playlists');
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Projects' })).not.toHaveAttribute('aria-current');
  });
});
