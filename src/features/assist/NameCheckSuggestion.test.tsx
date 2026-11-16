// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import '@/app/i18n';
import { NameCheckSuggestion } from './NameCheckSuggestion';
import { keptNames } from './useNameCheck';
import { checkNames } from './assist.service';

vi.mock('./assist.service');
const auth = vi.hoisted(() => ({ user: { id: 'me' } as { id: string } | null }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: auth.user }) }));
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast, toast }));

const mockedCheck = vi.mocked(checkNames);

function setup(onApply = vi.fn()) {
  render(
    <NameCheckSuggestion field="artist" value="Adelle" title="Hello" onApply={onApply}>
      <input aria-label="Artist" />
    </NameCheckSuggestion>,
  );
  return { input: screen.getByLabelText('Artist'), onApply };
}

const blur = async (input: HTMLElement, ms = 400) => {
  fireEvent.blur(input);
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
};

beforeEach(async () => {
  vi.useFakeTimers();
  keptNames.clear();
  auth.user = { id: 'me' };
  mockedCheck.mockReset();
  mockedCheck.mockResolvedValue([{ field: 'artist', suggestion: 'Adele', confidence: 0.9 }]);
  await i18n.changeLanguage('en');
});
afterEach(() => vi.useRealTimers());

describe('NameCheckSuggestion', () => {
  it('never requests while typing; requests once on blur after 400 ms', async () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'Adelle' } });
    fireEvent.focus(input);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(mockedCheck).not.toHaveBeenCalled();

    fireEvent.blur(input);
    await act(async () => { await vi.advanceTimersByTimeAsync(399); });
    expect(mockedCheck).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(mockedCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck).toHaveBeenCalledWith({ title: 'Hello', artist: 'Adelle' });
    expect(screen.getByRole('status')).toHaveTextContent('Did you mean Adele?');
  });

  it('Apply calls onApply with the suggestion and hides the row', async () => {
    const onApply = vi.fn();
    const { input } = setup(onApply);
    await blur(input);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('Adele');
  });

  it('Keep hides it, and blurring again with the same value sends no request', async () => {
    const { input } = setup();
    await blur(input);
    fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }));
    expect(screen.queryByRole('status')).toBeNull();
    await blur(input);
    expect(mockedCheck).toHaveBeenCalledTimes(1);
  });

  it('a rejected request renders nothing and shows no toast', async () => {
    mockedCheck.mockRejectedValue(new Error('assist_upstream'));
    const { input } = setup();
    await blur(input);
    expect(screen.queryByRole('status')).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('renders nothing for a guest', async () => {
    auth.user = null;
    const { input } = setup();
    await blur(input);
    expect(mockedCheck).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
