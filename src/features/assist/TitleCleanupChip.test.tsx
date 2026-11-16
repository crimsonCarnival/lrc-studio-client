// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import '@/app/i18n';
import { TitleCleanupChip } from './TitleCleanupChip';
import { splitTitle } from './assist.service';
import type { TitleSplit } from './assist.types';

vi.mock('./assist.service');
const auth = vi.hoisted(() => ({ user: { id: 'me' } as { id: string } | null }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: auth.user }) }));
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast, toast }));

const mockedSplit = vi.mocked(splitTitle);
const TITLE = 'PXNDX - Los Malaventurados No Lloran (Audio Oficial) [wvR7EtLuJfg]';
const SPLIT: TitleSplit = { songName: 'Los Malaventurados No Lloran', artists: ['PXNDX'], album: 'Para Ti Con Desprecio' };

beforeEach(async () => {
  auth.user = { id: 'me' };
  mockedSplit.mockReset();
  mockedSplit.mockResolvedValue(SPLIT);
  toast.error.mockReset();
  await i18n.changeLanguage('en');
});

describe('TitleCleanupChip', () => {
  it('hidden for a plain title', () => {
    render(<TitleCleanupChip title="Yesterday" onApply={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is hidden when signed out', () => {
    auth.user = null;
    render(<TitleCleanupChip title={TITLE} onApply={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('the request is sent only on click, and the form is not changed until Apply', async () => {
    const onApply = vi.fn();
    render(<TitleCleanupChip title={TITLE} onApply={onApply} />);
    expect(mockedSplit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Clean up title' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Los Malaventurados No Lloran');
    expect(screen.getByRole('status')).toHaveTextContent('PXNDX');
    expect(screen.getByRole('status')).toHaveTextContent('Para Ti Con Desprecio');
    expect(mockedSplit).toHaveBeenCalledTimes(1);
    expect(mockedSplit).toHaveBeenCalledWith(TITLE);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('Apply passes the split and hides chip and preview', async () => {
    const onApply = vi.fn();
    render(<TitleCleanupChip title={TITLE} onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clean up title' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(SPLIT);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('Dismiss hides it for that title only', async () => {
    const { rerender } = render(<TitleCleanupChip title={TITLE} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clean up title' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('button')).toBeNull();
    const other = 'Other (Official Video)';
    rerender(<TitleCleanupChip title={other} onApply={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Clean up title' })).toBeTruthy();
    rerender(<TitleCleanupChip title={TITLE} onApply={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('a failed request shows nothing and no toast', async () => {
    mockedSplit.mockRejectedValue(new Error('boom'));
    render(<TitleCleanupChip title={TITLE} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clean up title' }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('a stale response for an old title is not shown', async () => {
    let resolve!: (v: TitleSplit) => void;
    mockedSplit.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { rerender } = render(<TitleCleanupChip title={TITLE} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clean up title' }));
    rerender(<TitleCleanupChip title="Other (Official Video)" onApply={vi.fn()} />);
    await act(async () => { resolve(SPLIT); });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'Clean up title' })).toBeTruthy();
  });
});
