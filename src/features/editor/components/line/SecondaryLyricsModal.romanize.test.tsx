// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import '@/app/i18n';
import { SecondaryLyricsModal } from './SecondaryLyricsModal';
import { getUsage, romanize } from '@/features/assist/assist.service';
import type { EditorLine } from '@/features/editor/editor.types';

vi.mock('@/features/assist/assist.service');
const auth = vi.hoisted(() => ({ user: { id: 'me' } as { id: string } | null }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: auth.user }) }));
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast, toast }));

const mockedRomanize = vi.mocked(romanize);
const mockedUsage = vi.mocked(getUsage);

const LINES: EditorLine[] = [
  { text: 'こんにちは' },
  { type: 'section', label: 'chorus' },
  { text: '' },
  { text: 'さようなら' },
];
const manyLines = (n: number): EditorLine[] => Array.from({ length: n }, (_, i) => ({ text: `line ${i}` }));

const renderModal = (props: Partial<React.ComponentProps<typeof SecondaryLyricsModal>> = {}) => {
  const onApply = vi.fn();
  const modal = (open: boolean) => <SecondaryLyricsModal open={open} onOpenChange={() => {}} lines={LINES} onApply={onApply} songLanguage="Japanese" {...props} />;
  // The editor mounts the modal closed and opens it, which is what snapshots the lines.
  const utils = render(modal(false));
  utils.rerender(modal(true));
  return { onApply, ...utils };
};

beforeEach(async () => {
  auth.user = { id: 'me' };
  mockedRomanize.mockReset();
  mockedUsage.mockReset();
  mockedUsage.mockResolvedValue({ remaining: 12, cap: 20, resetsAt: '2026-11-16T00:00:00.000Z' } as never);
  mockedRomanize.mockResolvedValue({ lines: ['konnichiwa', '', 'sayonara'], usage: { remaining: 11, cap: 20, resetsAt: '2026-11-16T00:00:00.000Z' } as never });
  toast.error.mockReset();
  await i18n.changeLanguage('en');
});

const romanizeButton = () => screen.findByRole('button', { name: /^Romanize/ });
const textarea = () => screen.getByRole('textbox', { name: /./ }) as HTMLTextAreaElement;

describe('SecondaryLyricsModal romanize', () => {
  it('Romanize fills the textarea and does not call onApply', async () => {
    const { onApply } = renderModal();
    fireEvent.click(await screen.findByRole('button', { name: 'Romanize (12 left today)' }));
    await waitFor(() => expect(textarea().value).toBe('konnichiwa\n\nsayonara'));
    expect(mockedRomanize).toHaveBeenCalledWith({ lines: ['こんにちは', '', 'さようなら'], language: 'Japanese' });
    expect(onApply).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Romanize (11 left today)' })).toBeTruthy();
  });

  it('Apply after Romanize calls onApply with the romanized values and the opened lines', async () => {
    const { onApply } = renderModal();
    fireEvent.click(await romanizeButton());
    await waitFor(() => expect(textarea().value).toBe('konnichiwa\n\nsayonara'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(['konnichiwa', '', 'sayonara'], [LINES[0], LINES[2], LINES[3]], '');
  });

  it('is disabled above 200 main lines, with the reason in a tooltip', async () => {
    const user = userEvent.setup();
    renderModal({ lines: manyLines(201) });
    const button = await romanizeButton();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(mockedRomanize).not.toHaveBeenCalled();
    await user.hover(button);
    expect((await screen.findAllByText('Too long for this tool (max 200 lines)')).length).toBeGreaterThan(0);
  });

  it('is disabled, never sending, when a line is over 500 characters', async () => {
    const user = userEvent.setup();
    renderModal({ lines: [{ text: 'x'.repeat(501) }, { text: 'ok' }] });
    const button = await romanizeButton();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(mockedRomanize).not.toHaveBeenCalled();
    await user.hover(button);
    expect((await screen.findAllByText('A line is over 500 characters')).length).toBeGreaterThan(0);
  });

  it('is disabled with a reason when there are no lines to send', async () => {
    const user = userEvent.setup();
    renderModal({ lines: [{ type: 'section', label: 'intro' }] });
    const button = await romanizeButton();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(mockedRomanize).not.toHaveBeenCalled();
    await user.hover(button);
    expect((await screen.findAllByText('No lyric lines to send')).length).toBeGreaterThan(0);
  });

  it('keeps the same button element when the daily runs run out', async () => {
    mockedRomanize.mockRejectedValue(Object.assign(new Error('cap'), { code: 'assist_daily_cap', body: {} }));
    renderModal();
    const before = await romanizeButton();
    fireEvent.click(before);
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(before).toHaveAttribute('aria-disabled', 'true'));
    expect(await romanizeButton()).toBe(before);
  });

  it('a daily-cap error disables the button and shows the cap toast, leaving the text alone', async () => {
    mockedRomanize.mockRejectedValue(Object.assign(new Error('cap'), { code: 'assist_daily_cap', body: { resetsAt: '2026-11-16T00:00:00.000Z' } }));
    renderModal();
    fireEvent.click(await romanizeButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error.mock.calls[0][0]).toMatch(/daily runs/);
    expect(await romanizeButton()).toHaveAttribute('aria-disabled', 'true');
    expect(textarea().value).toBe('\n\n');
  });

  it('a late response after the modal closes does not overwrite the textarea', async () => {
    let resolve!: (v: Awaited<ReturnType<typeof romanize>>) => void;
    mockedRomanize.mockReturnValue(new Promise((r) => { resolve = r; }));
    const props = { onOpenChange: () => {}, lines: LINES, onApply: vi.fn(), songLanguage: 'Japanese' };
    const { rerender } = render(<SecondaryLyricsModal open={false} {...props} />);
    rerender(<SecondaryLyricsModal open {...props} />);
    fireEvent.click(await romanizeButton());
    rerender(<SecondaryLyricsModal open={false} {...props} />);
    rerender(<SecondaryLyricsModal open {...props} />);
    await act(async () => { resolve({ lines: ['late', '', 'late'], usage: { remaining: 3, cap: 20, resetsAt: '' } as never }); });
    // Reopening re-read the project's own secondary text (three empty lines); the late answer is not in it.
    expect(textarea().value).toBe('\n\n');
  });

  it('is not rendered in translation mode', async () => {
    renderModal({ kind: 'translation' });
    await screen.findByRole('button', { name: 'Apply' });
    expect(screen.queryByRole('button', { name: /^Romanize/ })).toBeNull();
    expect(mockedUsage).not.toHaveBeenCalled();
  });

  it('is not rendered for guests', async () => {
    auth.user = null;
    renderModal();
    await screen.findByRole('button', { name: 'Apply' });
    expect(screen.queryByRole('button', { name: /^Romanize/ })).toBeNull();
    expect(mockedUsage).not.toHaveBeenCalled();
  });
});
