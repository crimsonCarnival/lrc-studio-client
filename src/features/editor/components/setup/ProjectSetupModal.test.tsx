import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('react-google-recaptcha-v3', () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }) }));
vi.mock('@/app/api', () => ({ songMetadata: { lookupTrack: vi.fn() } }));
vi.mock('@/features/artists/ArtistsInput', () => ({ ArtistsInput: () => null }));
vi.mock('@/features/artists/ArtistImportReview', () => ({ ArtistImportReview: () => null }));
vi.mock('@/features/artists/TitleFeatSuggestion', () => ({ TitleFeatSuggestion: () => null }));

vi.mock('@/features/projects/components/PublishDialog', () => ({
  PublishDialog: ({ open, project, onPublished }: { open: boolean; project: { publicId?: string | null; isPublic: boolean }; onPublished?: (v: boolean) => void }) => (
    open ? <button onClick={() => onPublished?.(!project.isPublic)}>publish-dialog:{project.publicId}</button> : null
  ),
}));

import ProjectSetupModal from './ProjectSetupModal';

function renderModal(props: Partial<React.ComponentProps<typeof ProjectSetupModal>> = {}) {
  const onConfirm = vi.fn();
  render(<ProjectSetupModal isOpen onClose={vi.fn()} onConfirm={onConfirm} initialName="Song" {...props} />);
  return onConfirm;
}

describe('ProjectSetupModal visibility', () => {
  it('shows visibility read-only: no switch, and saving never sends a visibility', () => {
    const onConfirm = renderModal({ initialIsPublic: true, isEditing: true });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('project.visibilityPublic')).toBeInTheDocument();
    fireEvent.click(screen.getByText('common.save'));
    expect(onConfirm.mock.calls[0][0]).not.toHaveProperty('isPublic');
  });

  it('offers no visibility action for a project that is not saved', () => {
    renderModal({ isEditing: true });
    expect(screen.getByText('project.visibilityPrivate')).toBeInTheDocument();
    expect(screen.queryByText('project.visibilityManage')).not.toBeInTheDocument();
  });

  it('leads through the publish dialog and reflects only what it confirms', () => {
    const onVisibilityChange = vi.fn();
    renderModal({ isEditing: true, publicId: 'abc1234567', initialIsPublic: false, onVisibilityChange });
    expect(screen.getByText('project.visibilityPrivate')).toBeInTheDocument();
    fireEvent.click(screen.getByText('project.visibilityManage'));
    fireEvent.click(screen.getByText('publish-dialog:abc1234567'));
    expect(onVisibilityChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('project.visibilityPublic')).toBeInTheDocument();
  });
});
