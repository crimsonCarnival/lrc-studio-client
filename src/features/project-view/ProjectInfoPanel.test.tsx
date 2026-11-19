// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@/app/i18n';
import ProjectInfoPanel from './ProjectInfoPanel';

vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: { advanced: {} } }) }));
vi.mock('@ui/UserHoverCard', () => ({ UserHoverCard: ({ children }: { children: ReactNode }) => <span data-testid="hover-trigger">{children}</span> }));
vi.mock('./ProjectViewActions', () => ({ ProjectViewActions: () => null }));
vi.mock('./ShareToProfileButton', () => ({ ShareToProfileButton: () => null }));
vi.mock('./ShareOgButton', () => ({ ShareOgButton: () => null }));
vi.mock('./SongConnections', () => ({ SongConnections: () => null }));

const nameTag = {
  id: 'og',
  label: { en: 'Founder', es: 'Fundador' },
  description: { en: 'Joined early', es: 'Se unió pronto' },
  icon: '',
  color: 'primary',
};

const setup = (nameTagValue: typeof nameTag | null) =>
  render(
    <MemoryRouter>
      <ProjectInfoPanel
        project={{ publicId: 'p1', title: 'Song', user: { accountName: 'ana', displayName: 'Ana', nameTag: nameTagValue } }}
        isOwner={false}
        collapsed={false}
        onToggleCollapsed={() => {}}
      />
    </MemoryRouter>,
  );

describe('ProjectInfoPanel name tag', () => {
  it('shows the pill beside the author name when nameTag is provided', () => {
    setup(nameTag);
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('renders the pill outside the hover-card trigger', () => {
    setup(nameTag);
    expect(screen.getByText('Founder').closest('[data-testid="hover-trigger"]')).toBeNull();
    expect(screen.getByText('Ana').closest('[data-testid="hover-trigger"]')).not.toBeNull();
  });

  it('shows no pill when nameTag is null', () => {
    setup(null);
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Founder')).toBeNull();
  });
});

describe('ProjectInfoPanel album link', () => {
  const renderWith = (metadata: Record<string, unknown>) =>
    render(
      <MemoryRouter>
        <ProjectInfoPanel
          project={{ publicId: 'p1', title: 'Song', metadata, user: { accountName: 'ana' } } as never}
          isOwner={false}
          collapsed={false}
          onToggleCollapsed={() => {}}
        />
      </MemoryRouter>,
    );

  it('links the album to its catalog page when the server resolved one', () => {
    renderWith({ songAlbum: 'Honey', catalogAlbum: { artistSlug: 'robyn', albumSlug: 'honey' } });
    expect(screen.getByRole('link', { name: 'Honey' })).toHaveAttribute('href', '/artists/robyn/albums/honey');
  });

  it('keeps the album as plain text without a catalog match', () => {
    renderWith({ songAlbum: 'Honey', catalogAlbum: null });
    expect(screen.getByText('Honey')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Honey' })).toBeNull();
  });
});
