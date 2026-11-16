// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import '@/app/i18n';
import { DescribeSuggestion } from './DescribeSuggestion';
import { describeSong } from './assist.service';
import type { Description } from './assist.types';

vi.mock('./assist.service');
const auth = vi.hoisted(() => ({ user: { id: 'me' } as { id: string } | null }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: auth.user }) }));
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast, toast }));

const mockedDescribe = vi.mocked(describeSong);
const INPUT = { title: 'Yesterday', artist: 'The Beatles', lines: ['Yesterday, all my troubles seemed so far away', 'Now it looks as though they are here to stay'] };
const DESC: Description = { language: 'en', genre: 'rock', tags: ['nostalgic', 'sad'] };
const OPTIONS = ['English', 'Spanish'];

beforeEach(async () => {
  auth.user = { id: 'me' };
  mockedDescribe.mockReset();
  mockedDescribe.mockResolvedValue(DESC);
  toast.error.mockReset();
  await i18n.changeLanguage('en');
});

const suggest = () => fireEvent.click(screen.getByRole('button', { name: 'Suggest' }));

describe('DescribeSuggestion', () => {
  it('Suggest shows a proposal and does not call onApply', async () => {
    const onApply = vi.fn();
    render(<DescribeSuggestion input={INPUT} languageOptions={OPTIONS} onApply={onApply} />);
    expect(mockedDescribe).not.toHaveBeenCalled();
    suggest();
    const status = await screen.findByText(/nostalgic/);
    expect(status).toBeTruthy();
    expect(screen.getByRole('status')).toHaveTextContent('English');
    expect(mockedDescribe).toHaveBeenCalledWith(INPUT);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('Apply passes genre + tags, and language only when it is a known option, then hides the proposal', async () => {
    const onApply = vi.fn();
    const { unmount } = render(<DescribeSuggestion input={INPUT} languageOptions={OPTIONS} onApply={onApply} />);
    suggest();
    fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith({ language: 'English', genre: 'rock', tags: ['nostalgic', 'sad'] });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
    unmount();

    const noLang = vi.fn();
    render(<DescribeSuggestion input={INPUT} onApply={noLang} />);
    suggest();
    fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    expect(noLang).toHaveBeenCalledWith({ genre: 'rock', tags: ['nostalgic', 'sad'] });
  });

  it('a language that is not an option is not applied', async () => {
    mockedDescribe.mockResolvedValue({ ...DESC, language: 'ja' });
    const onApply = vi.fn();
    render(<DescribeSuggestion input={INPUT} languageOptions={OPTIONS} onApply={onApply} />);
    suggest();
    fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith({ genre: 'rock', tags: ['nostalgic', 'sad'] });
  });

  it('a genre outside PRIMARY_GENRES is not applied', async () => {
    mockedDescribe.mockResolvedValue({ ...DESC, genre: 'vaporwave' as never });
    const onApply = vi.fn();
    render(<DescribeSuggestion input={INPUT} onApply={onApply} />);
    suggest();
    fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith({ tags: ['nostalgic', 'sad'] });
  });

  it('hidden with no lyric lines, and when signed out', () => {
    const { rerender } = render(<DescribeSuggestion input={{ ...INPUT, lines: ['  ', ''] }} onApply={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    auth.user = null;
    rerender(<DescribeSuggestion input={INPUT} onApply={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sends at most 40 non-empty lines of at most 500 chars', async () => {
    const lines = ['', ...Array.from({ length: 60 }, (_, i) => `line ${i} ${'x'.repeat(600)}`)];
    render(<DescribeSuggestion input={{ lines }} onApply={vi.fn()} />);
    suggest();
    await screen.findByRole('status');
    await act(async () => { await Promise.resolve(); });
    const sent = mockedDescribe.mock.calls[0][0];
    expect(sent.lines).toHaveLength(40);
    expect(sent.lines.every((l) => l.length > 0 && l.length <= 500)).toBe(true);
  });

  it('a failed request shows nothing and no toast', async () => {
    mockedDescribe.mockRejectedValue(new Error('boom'));
    render(<DescribeSuggestion input={INPUT} onApply={vi.fn()} />);
    suggest();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('Dismiss hides the proposal without applying', async () => {
    const onApply = vi.fn();
    render(<DescribeSuggestion input={INPUT} onApply={onApply} />);
    suggest();
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('a stale response for changed input is not shown', async () => {
    let resolve!: (v: Description) => void;
    mockedDescribe.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { rerender } = render(<DescribeSuggestion input={INPUT} onApply={vi.fn()} />);
    suggest();
    rerender(<DescribeSuggestion input={{ ...INPUT, lines: ['Something else entirely'] }} onApply={vi.fn()} />);
    await act(async () => { resolve(DESC); });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'Suggest' })).toBeTruthy();
  });
});
