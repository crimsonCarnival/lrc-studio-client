import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('react-google-recaptcha-v3', () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }) }));
vi.mock('@/app/api', () => ({ songMetadata: { lookupTrack: vi.fn() } }));
vi.mock('@/features/artists/ArtistsInput', () => ({ ArtistsInput: () => null }));
vi.mock('@/features/artists/ArtistImportReview', () => ({ ArtistImportReview: () => null }));
vi.mock('@/features/artists/TitleFeatSuggestion', () => ({ TitleFeatSuggestion: () => null }));

import ProjectSetupModal from './ProjectSetupModal';

function renderModal(props: Partial<React.ComponentProps<typeof ProjectSetupModal>> = {}) {
  const onConfirm = vi.fn();
  render(<ProjectSetupModal isOpen onClose={vi.fn()} onConfirm={onConfirm} initialName="Song" {...props} />);
  return onConfirm;
}

describe('ProjectSetupModal visibility', () => {
  it('shows a read-only Private state for a new project and sends no visibility', () => {
    const onConfirm = renderModal({ isNewProject: true });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('project.visibilityPrivate')).toBeInTheDocument();
    fireEvent.click(screen.getByText('common.create'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).not.toHaveProperty('isPublic');
  });

  it('keeps the visibility switch for an existing project', () => {
    const onConfirm = renderModal({ initialIsPublic: true, isEditing: true });
    const sw = screen.getByRole('switch');
    expect(sw).toBeChecked();
    fireEvent.click(sw);
    fireEvent.click(screen.getByText('common.save'));
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ isPublic: false });
  });
});
