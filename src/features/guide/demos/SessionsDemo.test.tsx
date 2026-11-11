import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import SessionsDemo from './SessionsDemo';
import InviteCardMock from '../mocks/InviteCardMock';

beforeEach(async () => { await i18n.changeLanguage('en'); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('SessionsDemo', () => {
  it("tells you who has the line when you click Mika's line", () => {
    render(<SessionsDemo />);
    expect(screen.queryByText('Mika is working on this line')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Line 5/ }));
    expect(screen.getByText('Mika is working on this line')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Line 3/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves your cursor to a free line', () => {
    render(<SessionsDemo />);
    fireEvent.click(screen.getByRole('button', { name: /Line 1/ }));
    expect(screen.getByRole('button', { name: /Line 1/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows saving after an edit, then saved on its own', () => {
    vi.useFakeTimers();
    render(<SessionsDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Make an edit' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saving…');
    act(() => { vi.advanceTimersByTime(2600); });
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('turns into a read-only view for a viewer', () => {
    render(<SessionsDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'Viewer' }));
    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make an edit' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Line 1/ }));
    expect(screen.getByRole('button', { name: /Line 3/ })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('InviteCardMock', () => {
  it('shows the link once created and copies a clearly fake string', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<InviteCardMock />);
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New viewer link' }));
    expect(screen.getByText('Copy this link now. It is shown only once.')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy link' })); });
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('example');
    expect(copied).not.toContain(window.location.origin);
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });

  it('reports a failed copy when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    render(<InviteCardMock />);
    fireEvent.click(screen.getByRole('button', { name: 'New editor link' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy link' })); });
    expect(screen.getByText(/Could not copy/)).toBeInTheDocument();
  });
});
