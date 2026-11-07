import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('react-google-recaptcha-v3', () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }) }));
vi.mock('@/app/api', () => ({ songMetadata: { lookupTrack: vi.fn() } }));
vi.mock('@/features/artists/ArtistsInput', () => ({ ArtistsInput: () => null }));
vi.mock('@/features/artists/ArtistImportReview', () => ({ ArtistImportReview: () => null }));
vi.mock('@/features/artists/TitleFeatSuggestion', () => ({ TitleFeatSuggestion: () => null }));
vi.mock('@/features/projects/components/PublishDialog', () => ({
  PublishDialog: ({ open, project }: { open: boolean; project: { publicId?: string | null; isPublic: boolean } }) => (
    open ? <div>publish-dialog:{project.publicId}:{String(project.isPublic)}</div> : null
  ),
}));

import { AppModals } from './AppModals';

function renderModals(props: Partial<React.ComponentProps<typeof AppModals>> = {}) {
  render(
    <MemoryRouter>
      <AppModals
        setShowKeyboardHelp={vi.fn()} handleManualSave={vi.fn()} showNamingModal setShowNamingModal={vi.fn()}
        handleProjectConfirm={vi.fn()} mediaTitle="Song" handleDiscardProject={vi.fn()} handleRestoreProject={vi.fn()}
        setUnsavedModalTarget={vi.fn()} {...props}
      />
    </MemoryRouter>,
  );
}

describe('AppModals settings modal visibility', () => {
  it('shows a public project as Public and its change button opens the publish dialog', async () => {
    renderModals({ isPublic: true, publicId: 'abc1234567' });
    expect(await screen.findByText('project.visibilityPublic', {}, { timeout: 10000 })).toBeInTheDocument();
    fireEvent.click(screen.getByText('project.visibilityManage'));
    await waitFor(() => expect(screen.getByText('publish-dialog:abc1234567:true')).toBeInTheDocument());
  });

  it('offers no change button without a server id', async () => {
    renderModals({ isPublic: false, publicId: null });
    expect(await screen.findByText('project.visibilityPrivate', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByText('project.visibilityManage')).not.toBeInTheDocument();
  });
});
