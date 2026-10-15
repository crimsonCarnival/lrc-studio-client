// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import '@/app/i18n';

vi.mock('@/app/api', () => ({ getAccessToken: () => true }));

const suggest = vi.hoisted(() => ({
  impl: (async () => ({ total: 0, items: [] })) as (prefix: string, opts: { signal?: AbortSignal }) => Promise<{ total: number; items: Array<{ id: string; name: string }> }>,
  calls: [] as Array<{ prefix: string; signal?: AbortSignal }>,
}));
vi.mock('./artist-suggestions.service', () => ({
  SUGGESTION_LIMIT: 10,
  fetchArtistSuggestions: (prefix: string, opts: { signal?: AbortSignal } = {}) => {
    suggest.calls.push({ prefix, signal: opts.signal });
    return suggest.impl(prefix, opts);
  },
}));

import { ArtistsInput } from './ArtistsInput';
import type { ArtistCredit } from './artist-credits';

const credit = (name: string, role: 'primary' | 'featured', order = 0): ArtistCredit => ({ name, role, order });

function Harness({ initial = [], onValue }: { initial?: ArtistCredit[]; onValue?: (v: ArtistCredit[]) => void }) {
  const [value, setValue] = useState<ArtistCredit[]>(initial);
  return <ArtistsInput idPrefix="t" value={value} onChange={(next) => { setValue(next); onValue?.(next); }} />;
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const primaryInput = () => screen.getByRole('combobox', { name: 'Primary artists' });
const featuredInput = () => screen.getByRole('combobox', { name: 'Featured artists' });
const chips = (field: 'Primary artists' | 'Featured artists') =>
  within(screen.getByRole('list', { name: field })).queryAllByRole('listitem').map((li) => li.querySelector('button')?.textContent);

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  await i18n.changeLanguage('en');
  suggest.calls = [];
  suggest.impl = async () => ({ total: 0, items: [] });
});
afterEach(() => vi.useRealTimers());

describe('ArtistsInput: chips', () => {
  it('adds a primary artist with Enter and clears the field', async () => {
    const u = user();
    render(<Harness />);
    await u.type(primaryInput(), 'Radiohead{Enter}');
    expect(chips('Primary artists')).toEqual(['Radiohead']);
    expect(primaryInput()).toHaveValue('');
  });

  it('puts what is typed in the Featured field into featured, even as "A & B"', async () => {
    const u = user();
    render(<Harness initial={[credit('Drake', 'primary')]} />);
    await u.type(featuredInput(), 'Rihanna{Enter}');
    expect(chips('Featured artists')).toEqual(['Rihanna']);
  });

  it('splits "Drake feat. Rihanna" into a primary and a featured chip with nothing to confirm', async () => {
    const u = user();
    render(<Harness />);
    await u.type(primaryInput(), 'Drake feat. Rihanna{Enter}');
    expect(screen.queryByRole('group', { name: 'Check the artists' })).toBeNull();
    expect(chips('Primary artists')).toEqual(['Drake']);
    expect(chips('Featured artists')).toEqual(['Rihanna']);
  });

  it('does not add the same name twice, in either field', async () => {
    const u = user();
    render(<Harness initial={[credit('Drake', 'primary')]} />);
    await u.type(featuredInput(), 'drake{Enter}');
    expect(chips('Featured artists')).toEqual([]);
    expect(chips('Primary artists')).toEqual(['Drake']);
  });

  it('removes a chip with its remove button and with Backspace on an empty field', async () => {
    const u = user();
    render(<Harness initial={[credit('A', 'primary'), credit('B', 'primary', 1)]} />);
    await u.click(screen.getByRole('button', { name: 'Remove A' }));
    expect(chips('Primary artists')).toEqual(['B']);
    await u.click(primaryInput());
    await u.keyboard('{Backspace}');
    expect(chips('Primary artists')).toEqual([]);
  });
});

describe('ArtistsInput: reordering', () => {
  const three = [credit('A', 'primary'), credit('B', 'primary', 1), credit('C', 'primary', 2)];

  it('moves the focused chip with Alt+ArrowLeft / Alt+ArrowRight and announces it', async () => {
    const u = user();
    render(<Harness initial={three} />);
    screen.getByRole('button', { name: 'B, position 2 of 3' }).focus();
    await u.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    expect(chips('Primary artists')).toEqual(['B', 'A', 'C']);
    expect(document.body.textContent).toContain('B moved to position 1 of 3');
    await u.keyboard('{Alt>}{ArrowRight}{ArrowRight}{/Alt}');
    expect(chips('Primary artists')).toEqual(['A', 'C', 'B']);
  });

  it('does not move past either end', async () => {
    const u = user();
    render(<Harness initial={three} />);
    screen.getByRole('button', { name: 'A, position 1 of 3' }).focus();
    await u.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    expect(chips('Primary artists')).toEqual(['A', 'B', 'C']);
  });

  it('removes the focused chip with Delete', async () => {
    const u = user();
    render(<Harness initial={three} />);
    screen.getByRole('button', { name: 'B, position 2 of 3' }).focus();
    await u.keyboard('{Delete}');
    expect(chips('Primary artists')).toEqual(['A', 'C']);
  });
});

describe('ArtistsInput: validation', () => {
  it('asks for a primary artist when there are only featured ones', () => {
    render(<Harness initial={[credit('Rihanna', 'featured')]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one primary artist.');
  });

  it('shows no error for a valid list or an empty one', () => {
    const { unmount } = render(<Harness />);
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();
    render(<Harness initial={[credit('A', 'primary')]} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('stops at the limit from ARTIST_LIMITS and says so', () => {
    const ten = Array.from({ length: 10 }, (_, i) => credit(`Artist ${i}`, 'primary', i));
    render(<Harness initial={ten} />);
    expect(primaryInput()).toBeDisabled();
    expect(featuredInput()).toBeDisabled();
    expect(screen.getByText('A song can have at most 10 artists.')).toBeInTheDocument();
  });

  it('speaks Spanish too', async () => {
    await i18n.changeLanguage('es');
    render(<Harness initial={[credit('Rihanna', 'featured')]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Añade al menos un artista principal.');
  });
});

describe('ArtistsInput: flags are confirmed, never guessed', () => {
  async function paste(u: ReturnType<typeof user>, text: string) {
    await u.click(primaryInput());
    await u.paste(text);
  }

  it('shows the proposed split of "A, B & C" and applies it when confirmed', async () => {
    const u = user();
    render(<Harness />);
    await paste(u, 'Alpha, Beta & Gamma');
    expect(screen.getByRole('group', { name: 'Check the artists' })).toBeInTheDocument();
    expect(chips('Primary artists')).toEqual([]); // nothing applied yet
    await u.click(screen.getByRole('button', { name: 'Apply' }));
    expect(chips('Primary artists')).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(screen.queryByRole('group', { name: 'Check the artists' })).toBeNull();
  });

  it('shows plainly whether "A & B" is one artist or two, and updates as the person decides', async () => {
    const u = user();
    render(<Harness />);
    await paste(u, 'Simon & Garfunkel');
    const review = screen.getByRole('group', { name: 'Check the artists' });
    expect(within(review).getByText('(2 artists)')).toBeInTheDocument();
    expect(within(review).getAllByText(/^(Simon|Garfunkel)$/)).toHaveLength(2);
    await u.click(screen.getByRole('checkbox', { name: 'Join Simon and Garfunkel into one artist' }));
    expect(within(review).getByText('(1 artist)')).toBeInTheDocument();
    expect(within(review).getAllByText('Simon & Garfunkel').length).toBeGreaterThan(0);
    await u.click(screen.getByRole('checkbox', { name: 'Join Simon and Garfunkel into one artist' }));
    expect(within(review).getByText('(2 artists)')).toBeInTheDocument();
  });

  it('lets the person keep "Simon & Garfunkel" as one artist', async () => {
    const u = user();
    render(<Harness />);
    await paste(u, 'Simon & Garfunkel');
    await u.click(screen.getByRole('checkbox', { name: 'Join Simon and Garfunkel into one artist' }));
    await u.click(screen.getByRole('button', { name: 'Apply' }));
    expect(chips('Primary artists')).toEqual(['Simon & Garfunkel']);
  });

  it('merges one boundary and splits the other', async () => {
    const u = user();
    render(<Harness />);
    await paste(u, 'Earth, Wind & Fire');
    await u.click(screen.getByRole('checkbox', { name: 'Join Wind and Fire into one artist' }));
    await u.click(screen.getByRole('button', { name: 'Apply' }));
    expect(chips('Primary artists')).toEqual(['Earth', 'Wind & Fire']);
  });

  it('cancel applies nothing', async () => {
    const u = user();
    render(<Harness />);
    await paste(u, 'A & B');
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(chips('Primary artists')).toEqual([]);
    expect(screen.queryByRole('group', { name: 'Check the artists' })).toBeNull();
  });

  it('asks before treating a bare "ft" as featured: Apply waits for an answer', async () => {
    const u = user();
    render(<Harness />);
    await paste(u, 'Drake ft Rihanna');
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(apply).toBeDisabled();
    await u.click(screen.getByRole('radio', { name: 'Treat it as “feat.”' }));
    expect(apply).toBeEnabled();
    await u.click(apply);
    expect(chips('Primary artists')).toEqual(['Drake']);
    expect(chips('Featured artists')).toEqual(['Rihanna']);
  });

  it('leaves a bare "ft" as typed when asked to keep it', async () => {
    const u = user();
    render(<Harness />);
    await paste(u, 'Ft Lauderdale');
    await u.click(screen.getByRole('radio', { name: 'Keep it as typed' }));
    await u.click(screen.getByRole('button', { name: 'Apply' }));
    expect(chips('Primary artists')).toEqual(['Ft Lauderdale']);
  });

  it('warns about an empty feat. and an open bracket, and leaves the text as typed', async () => {
    const u = user();
    render(<Harness />);
    await u.click(primaryInput());
    await u.paste('Drake feat.');
    expect(screen.getByText(/A “feat\.” with no names was left as typed/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Apply' }));
    expect(chips('Primary artists')).toEqual(['Drake feat.']);
  });

  it('tells the person a repeated name was dropped', async () => {
    const u = user();
    render(<Harness />);
    await paste(u, 'A, a');
    expect(screen.getByText('“a” was listed twice and is kept once.')).toBeInTheDocument();
  });
});

describe('ArtistsInput: autocomplete', () => {
  const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

  it('waits for a pause in typing, then asks once with the prefix', async () => {
    const u = user();
    suggest.impl = async () => ({ total: 1, items: [{ id: '1', name: 'Drake' }] });
    render(<Harness />);
    await u.type(primaryInput(), 'dr');
    expect(suggest.calls).toHaveLength(0);
    await advance(250);
    expect(suggest.calls.map((c) => c.prefix)).toEqual(['dr']);
    expect(await screen.findByRole('option', { name: 'Drake' })).toBeInTheDocument();
  });

  it('cancels the request still in flight when the prefix changes', async () => {
    const u = user();
    suggest.impl = () => new Promise(() => { /* never answers */ });
    render(<Harness />);
    await u.type(primaryInput(), 'dr');
    await advance(250);
    const first = suggest.calls[0];
    expect(first.signal?.aborted).toBe(false);
    await u.type(primaryInput(), 'a');
    await advance(250);
    expect(first.signal?.aborted).toBe(true);
    expect(suggest.calls.map((c) => c.prefix)).toEqual(['dr', 'dra']);
  });

  it('ignores an answer that arrives after a newer one', async () => {
    const u = user();
    const answers: Array<(v: { total: number; items: Array<{ id: string; name: string }> }) => void> = [];
    suggest.impl = () => new Promise((resolve) => { answers.push(resolve); });
    render(<Harness />);
    await u.type(primaryInput(), 'dr');
    await advance(250);
    await u.type(primaryInput(), 'a');
    await advance(250);
    await act(async () => { answers[1]({ total: 1, items: [{ id: '2', name: 'Drake' }] }); });
    await act(async () => { answers[0]({ total: 1, items: [{ id: '1', name: 'Dr. Dre' }] }); });
    expect(screen.getByRole('option', { name: 'Drake' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Dr. Dre' })).toBeNull();
  });

  it('picks a suggestion with the arrow keys and Enter', async () => {
    const u = user();
    suggest.impl = async () => ({ total: 2, items: [{ id: '1', name: 'Drake' }, { id: '2', name: 'Draco' }] });
    render(<Harness />);
    await u.type(primaryInput(), 'dr');
    await advance(250);
    await screen.findByRole('option', { name: 'Draco' });
    await u.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(chips('Primary artists')).toEqual(['Draco']);
  });

  it('does not offer names already credited', async () => {
    const u = user();
    suggest.impl = async () => ({ total: 2, items: [{ id: '1', name: 'Drake' }, { id: '2', name: 'Draco' }] });
    render(<Harness initial={[credit('Drake', 'primary')]} />);
    await u.type(featuredInput(), 'dr');
    await advance(250);
    expect(await screen.findByRole('option', { name: 'Draco' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Drake' })).toBeNull();
  });

  it('shows loading, empty and error states', async () => {
    const u = user();
    let resolve!: (v: { total: number; items: [] }) => void;
    suggest.impl = () => new Promise((r) => { resolve = r; });
    render(<Harness />);
    await u.type(primaryInput(), 'zz');
    await advance(250);
    expect(screen.getByText('Searching…')).toBeInTheDocument();
    await act(async () => { resolve({ total: 0, items: [] }); });
    expect(await screen.findByText('No matching artists in your library')).toBeInTheDocument();

    suggest.impl = async () => { throw new Error('boom'); };
    await u.type(primaryInput(), 'z');
    await advance(250);
    expect(await screen.findByText('Could not load suggestions')).toBeInTheDocument();
  });
});
