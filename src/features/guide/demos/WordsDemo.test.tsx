import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import WordsDemo from './WordsDemo';

beforeEach(async () => { await i18n.changeLanguage('en'); });

describe('WordsDemo', () => {
  it('explains the lock when the locked Words option is clicked', () => {
    render(<WordsDemo />);
    expect(screen.queryByText(i18n.t('editor.modeWordsLocked'))).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Words' }));
    expect(screen.getByText(i18n.t('editor.modeWordsLocked'))).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Words' }).getAttribute('aria-selected')).toBe('false');
  });

  it('unlocks Words once a line is stamped, then stamps words', () => {
    render(<WordsDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark' }));
    expect(screen.getByRole('tab', { name: 'Words' }).getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Words' }));
    expect(screen.getByRole('tab', { name: 'Words' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Mark' }));
    expect(document.querySelectorAll('[data-word-stamped="true"]').length).toBe(1);
  });
});
