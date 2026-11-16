// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import '@/app/i18n';
import TaggingToolbar from './TaggingToolbar';
import { getUsage, labelSingers } from '@/features/assist/assist.service';
import type { EditorLine } from '@/features/editor/editor.types';

vi.mock('@/features/assist/assist.service');
const auth = vi.hoisted(() => ({ user: { id: 'me' } as { id: string } | null }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: auth.user }) }));
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast, toast }));

const mockedLabel = vi.mocked(labelSingers);
const mockedUsage = vi.mocked(getUsage);
const USAGE = { used: 1, limit: 20, remaining: 19, resetsAt: '2026-11-16T00:00:00.000Z' };

const mk = (n: number): EditorLine[] => Array.from({ length: n }, (_, i) => ({ id: `l${i}`, text: `line ${i}` }));

const renderBar = (lines: EditorLine[], songArtists: string[], selected: number[] = [0], onApply = vi.fn()) => {
  render(
    <TaggingToolbar
      lines={lines}
      setLines={vi.fn()}
      selectedLines={new Set(selected)}
      recordIndexMap={vi.fn()}
      songArtists={songArtists}
      clearSelection={vi.fn()}
      onApplySingerLabels={onApply}
    />,
  );
  return onApply;
};

beforeEach(async () => {
  auth.user = { id: 'me' };
  mockedLabel.mockReset();
  mockedUsage.mockReset();
  mockedUsage.mockResolvedValue(USAGE);
  toast.error.mockReset();
  await i18n.changeLanguage('en');
});

const button = () => screen.getByRole('button', { name: /Suggest singers/ });

describe('TaggingToolbar suggest singers', () => {
  it('is hidden for guests', () => {
    auth.user = null;
    renderBar(mk(2), ['Ann', 'Bob']);
    expect(screen.queryByRole('button', { name: /Suggest singers/ })).toBeNull();
  });

  it('is inert with fewer than two singers', () => {
    renderBar(mk(2), ['Ann']);
    expect(button().getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button());
    expect(mockedLabel).not.toHaveBeenCalled();
  });

  it('stays enabled for a small selection of a long song', () => {
    renderBar(mk(201), ['Ann', 'Bob'], [0]);
    expect(button().getAttribute('aria-disabled')).toBe('false');
  });

  it('is inert when the selection exceeds 200 lines', () => {
    renderBar(mk(201), ['Ann', 'Bob'], Array.from({ length: 201 }, (_, i) => i));
    expect(button().getAttribute('aria-disabled')).toBe('true');
  });

  it('is inert once the daily runs are used up', async () => {
    mockedUsage.mockResolvedValue({ ...USAGE, remaining: 0 });
    renderBar(mk(2), ['Ann', 'Bob']);
    await waitFor(() => expect(button().getAttribute('aria-disabled')).toBe('true'));
  });

  it('sends only the selected lines, then applies reviewed labels', async () => {
    mockedLabel.mockResolvedValue({ labels: [{ lineIndex: 1, singers: ['Ann', 'Bob'] }], usage: { ...USAGE, remaining: 18 } });
    const lines = mk(3);
    const onApply = renderBar(lines, ['Ann', 'Bob'], [1, 2]);
    await waitFor(() => expect(button().textContent).toContain('19 left today'));
    fireEvent.click(button());
    await waitFor(() => expect(mockedLabel).toHaveBeenCalledWith({ lines: ['line 1', 'line 2'], roster: ['Ann', 'Bob'] }));
    const apply = await screen.findByRole('button', { name: 'Apply' });
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(apply);
    expect(onApply).toHaveBeenCalledWith([{ lineIndex: 1, singers: ['Ann', 'Bob'] }], [lines[1], lines[2]]);
  });

  it('reports a failed run', async () => {
    mockedLabel.mockRejectedValue({ code: 'assist_upstream' });
    renderBar(mk(2), ['Ann', 'Bob']);
    fireEvent.click(button());
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
  });
});
