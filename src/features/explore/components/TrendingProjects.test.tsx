// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@/app/i18n';
import { useTrendingProjects } from '../hooks/useExplore';
import { TrendingProjects } from './TrendingProjects';

vi.mock('../hooks/useExplore', () => ({
  useTrendingProjects: vi.fn(),
  useExploreTracking: () => vi.fn(),
}));

const nameTag = {
  id: 'og',
  label: { en: 'Founder', es: 'Fundador' },
  description: { en: 'Joined early', es: 'Se unió pronto' },
  icon: '',
  color: 'primary',
};

const setup = (tag: typeof nameTag | null) => {
  vi.mocked(useTrendingProjects).mockReturnValue({
    projects: [{ id: 'p1', publicId: 'p1', title: 'Song', accountName: 'ana', user: { accountName: 'ana', displayName: 'Ana', nameTag: tag } }],
    loading: false,
    error: null,
  } as never);
  return render(<MemoryRouter><TrendingProjects /></MemoryRouter>);
};

describe('TrendingProjects name tag', () => {
  it('shows the pill beside the owner name when nameTag is provided', () => {
    setup(nameTag);
    expect(screen.getAllByText('Founder').length).toBeGreaterThan(0);
  });

  it('shows no pill when nameTag is null', () => {
    setup(null);
    expect(screen.queryByText('Founder')).toBeNull();
  });
});
