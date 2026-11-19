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

function setup(onApply = vi.fn(), title = 'Hello', value = 'Adelle') {
  render(
    <NameCheckSuggestion field="artist" value={value} title={title} onApply={onApply}>
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
    expect(mockedCheck).toHaveBeenCalledWith({ title: 'Hello', field: 'artist', artist: 'Adelle' });
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
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await blur(input);
    expect(mockedCheck).toHaveBeenCalledTimes(1);
  });

  it('a rejected request renders nothing and shows no toast', async () => {
    mockedCheck.mockRejectedValue(new Error('assist_upstream'));
    const { input } = setup();
    await blur(input);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('renders nothing for a guest', async () => {
    auth.user = null;
    const { input } = setup();
    await blur(input);
    expect(mockedCheck).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('sends nothing when the title is empty or only spaces', async () => {
    const { input } = setup(vi.fn(), '   ');
    await blur(input);
    expect(mockedCheck).not.toHaveBeenCalled();
  });

  it('sends trimmed values cut to the server bounds', async () => {
    const { input } = setup(vi.fn(), `  ${'t'.repeat(600)}  `, ` ${'a'.repeat(400)} `);
    await blur(input);
    expect(mockedCheck).toHaveBeenCalledWith({ title: 't'.repeat(500), field: 'artist', artist: 'a'.repeat(300) });
  });

  it('a failed request can be retried for the same value', async () => {
    mockedCheck.mockRejectedValueOnce(new Error('assist_upstream'));
    const { input } = setup();
    await blur(input);
    await blur(input);
    expect(mockedCheck).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('Did you mean Adele?');
  });

  it('refocusing within the debounce cancels the pending request', async () => {
    const { input } = setup();
    fireEvent.blur(input);
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    fireEvent.focus(input);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(mockedCheck).not.toHaveBeenCalled();
  });

  it('a function child places the suggestion where it is rendered, not at the end', async () => {
    render(
      <NameCheckSuggestion field="artist" value="Adelle" title="Hello" onApply={vi.fn()}>
        {(suggestion) => (<><input aria-label="Artist" />{suggestion}<p data-testid="after">other fields</p></>)}
      </NameCheckSuggestion>,
    );
    await blur(screen.getByLabelText('Artist'));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Did you mean Adele?');
    expect(status.compareDocumentPosition(screen.getByTestId('after')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the same input element when the person signs in', async () => {
    auth.user = null;
    const { rerender } = render(
      <NameCheckSuggestion field="artist" value="Adelle" title="Hello" onApply={vi.fn()}><input aria-label="Artist" /></NameCheckSuggestion>,
    );
    const before = screen.getByLabelText('Artist');
    auth.user = { id: 'me' };
    rerender(
      <NameCheckSuggestion field="artist" value="Adelle" title="Hello" onApply={vi.fn()}><input aria-label="Artist" /></NameCheckSuggestion>,
    );
    expect(screen.getByLabelText('Artist')).toBe(before);
  });

  describe('album checks', () => {
    function setupAlbum(artist: string | undefined) {
      mockedCheck.mockResolvedValue([{ field: 'album', suggestion: 'OK Computer', confidence: 1 }]);
      const utils = render(
        <NameCheckSuggestion field="album" value="ok computer" title="Airbag" artist={artist} onApply={vi.fn()}>
          <input aria-label="Album" />
        </NameCheckSuggestion>,
      );
      return { input: screen.getByLabelText('Album'), ...utils };
    }

    it('sends the artist as context and asks only about the album', async () => {
      const { input } = setupAlbum(' Radiohead ');
      await blur(input);
      expect(mockedCheck).toHaveBeenCalledWith({ title: 'Airbag', field: 'album', album: 'ok computer', artist: 'Radiohead' });
      expect(screen.getByRole('status')).toHaveTextContent('OK Computer');
    });

    it('omits the artist when there is none', async () => {
      const { input } = setupAlbum(undefined);
      await blur(input);
      expect(mockedCheck).toHaveBeenCalledWith({ title: 'Airbag', field: 'album', album: 'ok computer' });
    });

    it('asks again for the same album once the artist changes', async () => {
      const { input, rerender } = setupAlbum('Radiohed');
      await blur(input);
      rerender(
        <NameCheckSuggestion field="album" value="ok computer" title="Airbag" artist="Radiohead" onApply={vi.fn()}>
          <input aria-label="Album" />
        </NameCheckSuggestion>,
      );
      await blur(screen.getByLabelText('Album'));
      expect(mockedCheck).toHaveBeenCalledTimes(2);
      expect(mockedCheck).toHaveBeenLastCalledWith(expect.objectContaining({ artist: 'Radiohead' }));
    });
  });
});
