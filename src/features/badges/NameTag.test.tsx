// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import '@/app/i18n';
import { NameTag } from './NameTag';
import type { NameTagData } from './badges.types';

const tag: NameTagData = {
  id: 'og',
  label: { en: 'Founder', es: 'Fundador' },
  description: { en: 'Joined early', es: 'Se unió pronto' },
  icon: '🎵',
  color: 'primary',
};

afterEach(() => i18n.changeLanguage('en'));

describe('NameTag', () => {
  it('renders nothing for null', () => {
    const { container } = render(<NameTag tag={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows icon and label in English', () => {
    render(<NameTag tag={tag} />);
    expect(screen.getByText('Founder')).toBeInTheDocument();
    expect(screen.getByText('🎵')).toBeInTheDocument();
  });

  it('uses the Spanish label when language is es, falls back to en when es is empty', async () => {
    await i18n.changeLanguage('es');
    const { rerender } = render(<NameTag tag={tag} />);
    expect(screen.getByText('Fundador')).toBeInTheDocument();
    rerender(<NameTag tag={{ ...tag, label: { en: 'Founder', es: '' } }} />);
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('the tint is a var(--color-*) token, never a hex', () => {
    render(<NameTag tag={tag} />);
    const pill = screen.getByText('Founder').parentElement as HTMLElement;
    expect(pill.style.borderColor.startsWith('var(--color-')).toBe(true);
    expect(pill.style.color.startsWith('var(--color-')).toBe(true);
  });

  it('announces "Name tag: <label>" via sr-only text, not an aria-label on a span', () => {
    const { container } = render(<NameTag tag={tag} />);
    expect(container.querySelector('[aria-label]')).toBeNull();
    const sr = screen.getByText('Name tag: Founder');
    expect(sr).toHaveClass('sr-only');
    expect(screen.getByText('Founder')).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes the description as tooltip content', async () => {
    render(<NameTag tag={tag} />);
    await userEvent.hover(screen.getByText('Founder'));
    expect((await screen.findAllByText('Joined early')).length).toBeGreaterThan(0);
  });
});
