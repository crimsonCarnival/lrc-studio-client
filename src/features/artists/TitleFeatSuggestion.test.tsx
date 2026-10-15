// @vitest-environment jsdom
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import '@/app/i18n';
import { TitleFeatSuggestion } from './TitleFeatSuggestion';
import type { ArtistCredit } from './artist-credits';

function Harness({ initialTitle, onApply }: { initialTitle: string; onApply: (title: string, featured: ArtistCredit[]) => void }) {
  const [title, setTitle] = useState(initialTitle);
  return (
    <>
      <input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <TitleFeatSuggestion title={title} onApply={(t, f) => { setTitle(t); onApply(t, f); }} />
    </>
  );
}

beforeEach(async () => { await i18n.changeLanguage('en'); });

describe('TitleFeatSuggestion', () => {
  it('offers nothing for a title without featured artists', () => {
    render(<Harness initialTitle="Plain Song" onApply={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('suggests moving "(feat. A & B)" and never applies it on its own', () => {
    const onApply = vi.fn();
    render(<Harness initialTitle="Song (feat. A & B)" onApply={onApply} />);
    expect(screen.getByRole('status')).toHaveTextContent('Move “feat. A & B” to Featured artists and use the title “Song”?');
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Title')).toHaveValue('Song (feat. A & B)');
  });

  it('applies: the cleaned title and the names as featured, once the doubtful split is confirmed', async () => {
    const onApply = vi.fn();
    render(<Harness initialTitle="Song (feat. A & B)" onApply={onApply} />);
    await userEvent.click(screen.getByRole('button', { name: 'Move it' }));
    // "A & B" might be one act, so the review comes first.
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('Song', [
      { name: 'A', role: 'featured', order: 0 },
      { name: 'B', role: 'featured', order: 1 },
    ]);
    expect(screen.getByLabelText('Title')).toHaveValue('Song');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('applies straight away when nothing is doubtful', async () => {
    const onApply = vi.fn();
    render(<Harness initialTitle="Song (feat. Rihanna)" onApply={onApply} />);
    await userEvent.click(screen.getByRole('button', { name: 'Move it' }));
    expect(onApply).toHaveBeenCalledWith('Song', [{ name: 'Rihanna', role: 'featured', order: 0 }]);
  });

  it('works for ft., featuring and "with" in brackets, but not "with" outside them', () => {
    const { unmount } = render(<Harness initialTitle="Song ft. Bob" onApply={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    unmount();
    const second = render(<Harness initialTitle="Song featuring Bob" onApply={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    second.unmount();
    const third = render(<Harness initialTitle="Song (with Bob)" onApply={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    third.unmount();
    render(<Harness initialTitle="Dancing with Bob" onApply={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('dismissing sticks for that title text, and returns for a different one', async () => {
    const onApply = vi.fn();
    render(<Harness initialTitle="Song (feat. Bob)" onApply={onApply} />);
    await userEvent.click(screen.getByRole('button', { name: 'Keep as is' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(onApply).not.toHaveBeenCalled();

    const input = screen.getByLabelText('Title');
    // Same text typed again later: still dismissed.
    await userEvent.type(input, '!');
    expect(screen.getByRole('status')).toBeInTheDocument(); // a different title, so it is offered again
    await userEvent.type(input, '{Backspace}');
    expect(screen.queryByRole('status')).toBeNull(); // back to the dismissed text
  });

  it('does not offer a bare "ft" without a question first', async () => {
    const onApply = vi.fn();
    render(<Harness initialTitle="Song ft Bob" onApply={onApply} />);
    await userEvent.click(screen.getByRole('button', { name: 'Move it' }));
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('radio', { name: 'Treat it as “feat.”' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('Song', [{ name: 'Bob', role: 'featured', order: 0 }]);
  });

  it('never offers a move that would leave the title empty', () => {
    // "Ft Lauderdale Nights" reads as a featured marker at the very start; removing it would erase the title.
    render(<Harness initialTitle="Ft Lauderdale Nights" onApply={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
