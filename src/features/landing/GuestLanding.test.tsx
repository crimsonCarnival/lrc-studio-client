import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import GuestLanding from './GuestLanding';
import LandingTapDemo from './LandingTapDemo';
import en from '@/locales/en/landing.js';
import es from '@/locales/es/landing.js';

// The canvas animation is irrelevant here and jsdom has no 2d context.
vi.mock('./SmoothWavyCanvas', () => ({ default: () => null }));

function setWidth(width: number) {
  window.matchMedia = vi.fn((query: string) => {
    const m = /min-width:\s*([\d.]+)(rem|px)/.exec(query);
    const matches = m ? width >= parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1) : false;
    return {
      matches, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    };
  }) as unknown as typeof window.matchMedia;
}

const originalMatchMedia = window.matchMedia;
const renderLanding = () => render(<MemoryRouter><GuestLanding /></MemoryRouter>);

beforeEach(async () => { await i18n.changeLanguage('en'); });
afterEach(() => { window.matchMedia = originalMatchMedia; vi.useRealTimers(); });

describe('GuestLanding copy by width', () => {
  it('says tap below lg', () => {
    setWidth(360);
    renderLanding();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/^Tap\s*when the line\s*lands\.$/);
    expect(h1).not.toHaveTextContent(/enter/i);
    expect(screen.getByRole('link', { name: 'Start syncing a song' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByText('enter')).not.toBeInTheDocument();
  });

  it('keeps the Enter wording at lg and up', () => {
    setWidth(1280);
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Hit Enter\s*when the line\s*lands\.$/);
    expect(screen.getByRole('link', { name: 'Open the editor' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tap to stamp' })).not.toBeInTheDocument();
    expect(screen.getByText('Press Enter or click Stamp to time the line')).toBeInTheDocument();
  });

  it('speaks Spanish tap copy below lg', async () => {
    await i18n.changeLanguage('es');
    setWidth(360);
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Toca\s*cuando la línea\s*entra\.$/);
    expect(screen.getByRole('button', { name: 'Toca para marcar' })).toBeInTheDocument();
  });
});

describe('GuestLanding steps', () => {
  it('shows compact rows on phones with the full walkthrough behind a disclosure', async () => {
    setWidth(360);
    renderLanding();
    expect(screen.getByText('Name it, then add the song and artist.')).toBeInTheDocument();
    expect(screen.queryByText(/Under Media, hit Search/)).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'See an example' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.setup().click(toggle);
    expect(screen.getByRole('button', { name: 'Hide the example' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Under Media, hit Search/)).toBeInTheDocument();
    expect(screen.getByText(/Tap on each line, then export/)).toBeInTheDocument();
  });

  it('shows the full steps at lg and up, with no disclosure', () => {
    setWidth(1280);
    renderLanding();
    expect(screen.getByText(/Under Media, hit Search/)).toBeInTheDocument();
    expect(screen.getByText(/Press Enter on each line/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'See an example' })).not.toBeInTheDocument();
  });
});

describe('LandingTapDemo', () => {
  const pointerTap = (el: HTMLElement) => {
    fireEvent.pointerDown(el, { isPrimary: true, button: 0, pointerType: 'touch' });
    fireEvent.pointerUp(el, { isPrimary: true, button: 0, pointerType: 'touch' });
    fireEvent.click(el, { detail: 0 });
  };

  it('stamps once per tap, advances and shows the formatted timestamp', () => {
    vi.useFakeTimers();
    render(<LandingTapDemo />);
    const btn = screen.getByRole('button', { name: 'Tap to stamp' });
    expect(screen.getByText('Line 1 of 5')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3600); });
    pointerTap(btn);
    expect(screen.getByText('Line 2 of 5')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Stamped \[00:0[34]\.\d\d\]/);
    // A tap whose trailing click carries detail 1 still counts once.
    fireEvent.pointerDown(btn, { isPrimary: true, button: 0, pointerType: 'touch' });
    fireEvent.click(btn, { detail: 1 });
    expect(screen.getByText('Line 3 of 5')).toBeInTheDocument();
  });

  it('works from the keyboard, once per press', async () => {
    render(<LandingTapDemo />);
    const btn = screen.getByRole('button', { name: 'Tap to stamp' });
    btn.focus();
    const user = userEvent.setup();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Line 2 of 5')).toBeInTheDocument();
    await user.keyboard(' ');
    expect(screen.getByText('Line 3 of 5')).toBeInTheDocument();
  });

  it('finishes after the last line and can start over', async () => {
    render(<LandingTapDemo />);
    const user = userEvent.setup();
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: 'Tap to stamp' }));
    expect(screen.getByText('All 5 lines stamped.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tap to stamp' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Line 1 of 5')).toBeInTheDocument();
  });

  it('left-aligns the lyric and marks the Japanese line', async () => {
    render(<LandingTapDemo />);
    const user = userEvent.setup();
    for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Tap to stamp' }));
    const jp = document.querySelector('[lang="ja"]');
    expect(jp).toHaveTextContent('月明かりに照らされた道を');
    expect(jp?.closest('.text-left')).not.toBeNull();
  });
});

describe('landing locale parity', () => {
  type Tree = { [k: string]: string | Tree };
  const leaves = (tree: Tree, prefix = ''): Record<string, string> =>
    Object.entries(tree).reduce<Record<string, string>>((out, [k, v]) => {
      const path = prefix ? `${prefix}.${k}` : k;
      return typeof v === 'string' ? { ...out, [path]: v } : { ...out, ...leaves(v, path) };
    }, {});
  const holders = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

  it('has the same keys and placeholders in en and es', () => {
    const a = leaves(en as Tree);
    const b = leaves(es as Tree);
    expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
    for (const k of Object.keys(a)) expect(holders(b[k])).toEqual(holders(a[k]));
  });
});
