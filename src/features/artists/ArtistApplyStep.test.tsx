// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import '@/app/i18n';
import { ArtistApplyStep } from './ArtistApplyStep';

beforeEach(async () => { await i18n.changeLanguage('en'); });

describe('ArtistApplyStep', () => {
  it('uses the primary artists by default and applies only them', async () => {
    const onApply = vi.fn();
    render(<ArtistApplyStep song={{ title: 'Song', artist: 'Drake feat. Rihanna' }} onApply={onApply} onSkip={vi.fn()} />);
    expect(screen.getByText(/found with: Drake$/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Primary artists only' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Use artists' }));
    expect(onApply).toHaveBeenCalledWith([{ name: 'Drake', role: 'primary', order: 0 }]);
  });

  it('includes the featured artists only when asked to', async () => {
    const onApply = vi.fn();
    render(<ArtistApplyStep song={{ title: 'Song', artist: 'Drake feat. Rihanna' }} onApply={onApply} onSkip={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Include featured artists' }));
    expect(screen.getByText(/found with: Drake feat\. Rihanna$/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Use artists' }));
    expect(onApply).toHaveBeenCalledWith([
      { name: 'Drake', role: 'primary', order: 0 },
      { name: 'Rihanna', role: 'featured', order: 1 },
    ]);
  });

  it('offers no choice when there is nothing featured', () => {
    render(<ArtistApplyStep song={{ title: 'Song', artist: 'Radiohead' }} onApply={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('confirms a doubtful split before applying anything', async () => {
    const onApply = vi.fn();
    render(<ArtistApplyStep song={{ title: 'Song', artist: 'Simon & Garfunkel' }} onApply={onApply} onSkip={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Use artists' }));
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Join Simon and Garfunkel into one artist' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith([{ name: 'Simon & Garfunkel', role: 'primary', order: 0 }]);
  });

  it('skip applies nothing', async () => {
    const onApply = vi.fn();
    const onSkip = vi.fn();
    render(<ArtistApplyStep song={{ title: 'Song', artist: 'A' }} onApply={onApply} onSkip={onSkip} />);
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('words the file import differently', () => {
    render(<ArtistApplyStep variant="import" song={{ title: '', artist: 'A' }} onApply={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText('Artists found in this file')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep current artists' })).toBeInTheDocument();
  });
});
