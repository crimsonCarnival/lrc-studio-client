// @vitest-environment jsdom
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/app/i18n';

const { setNameTag, toastError } = vi.hoisted(() => ({ setNameTag: vi.fn(), toastError: vi.fn() }));
vi.mock('./services/name-tag.service', () => ({ setNameTag }));
vi.mock('react-hot-toast', () => ({ default: { error: toastError } }));
vi.mock('./BadgeDefsContext', () => ({
  useBadgeDefs: () => ({
    og: { id: 'og', label: { en: 'Founder', es: 'Fundador' }, description: { en: 'Early', es: 'Pronto' }, icon: '🎵', color: 'primary', rarity: 'rare' },
    pioneer: { id: 'pioneer', label: { en: 'Trailblazer', es: 'Pionero' }, description: { en: 'First', es: 'Primero' }, icon: '🚀', color: 'teal', rarity: 'common' },
    unearned: { id: 'unearned', label: { en: 'Nope', es: 'No' }, description: { en: 'x', es: 'x' }, icon: '', color: 'blue', rarity: 'common' },
  }),
}));

import { NameTagPicker } from './NameTagPicker';

const earned = [{ id: 'og' }, { id: 'pioneer' }, { id: 'ghost-without-definition' }];

function Harness({ initial = null, staff = false, spy, onSaved }: { initial?: string | null; staff?: boolean; spy?: (v: string | null) => void; onSaved?: () => void }) {
  const [value, setValue] = useState<string | null>(initial);
  return <NameTagPicker earned={earned} value={value} staff={staff} onChange={v => { spy?.(v); setValue(v); }} onSaved={onSaved} />;
}

beforeEach(() => { setNameTag.mockReset(); toastError.mockReset(); setNameTag.mockResolvedValue(undefined); });

describe('NameTagPicker', () => {
  it('lists only earned badges plus None', () => {
    render(<Harness />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3); // None + og + pioneer (no definition => skipped)
    expect(screen.getByRole('radio', { name: /Founder/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Trailblazer/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Nope/ })).toBeNull();
    expect(screen.getByRole('radio', { name: /None/i })).toBeInTheDocument();
  });

  it('selecting a badge calls setNameTag with its id and reports the new value', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await userEvent.click(screen.getByRole('radio', { name: /Founder/ }));
    expect(setNameTag).toHaveBeenCalledWith('og');
    expect(spy).toHaveBeenCalledWith('og');
    expect(screen.getByRole('radio', { name: /Founder/ })).toBeChecked();
  });

  it('choosing None calls setNameTag(null)', async () => {
    const spy = vi.fn();
    render(<Harness initial="og" spy={spy} />);
    await userEvent.click(screen.getByRole('radio', { name: /None/i }));
    expect(setNameTag).toHaveBeenCalledWith(null);
    expect(spy).toHaveBeenCalledWith(null);
  });

  it('a failed save reverts the selection and shows an error toast', async () => {
    setNameTag.mockRejectedValueOnce(new Error('boom'));
    const spy = vi.fn();
    render(<Harness initial="og" spy={spy} />);
    await userEvent.click(screen.getByRole('radio', { name: /Trailblazer/ }));
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenLastCalledWith('og');
    expect(screen.getByRole('radio', { name: /Founder/ })).toBeChecked();
  });

  it('calls onSaved only after a successful save', async () => {
    const onSaved = vi.fn();
    render(<Harness onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('radio', { name: /Founder/ }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));

    setNameTag.mockRejectedValueOnce(new Error('boom'));
    await userEvent.click(screen.getByRole('radio', { name: /Trailblazer/ }));
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shows the Staff pill and default hint for staff with no equipped tag', () => {
    render(<Harness staff />);
    expect(screen.getByLabelText(/Staff/)).toBeInTheDocument();
    expect(screen.getByText(/by default/i)).toBeInTheDocument();
  });
});
