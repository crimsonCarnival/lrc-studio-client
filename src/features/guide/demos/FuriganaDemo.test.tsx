import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import FuriganaDemo from './FuriganaDemo';

beforeEach(async () => { await i18n.changeLanguage('en'); });

const field = () => screen.getByLabelText(i18n.t('guide.demo.furiganaField'));

describe('FuriganaDemo', () => {
  it('renders a ruby with its reading for typed markup', () => {
    render(<FuriganaDemo />);
    fireEvent.change(field(), { target: { value: '{漢字|かんじ}' } });
    const ruby = document.querySelector('ruby');
    expect(ruby?.textContent).toContain('漢字');
    expect(ruby?.querySelector('rt')?.textContent).toBe('かんじ');
  });

  it('keeps plain text outside the markup and drops readings over kana', () => {
    render(<FuriganaDemo />);
    fireEvent.change(field(), { target: { value: '{空|そら}の{うた|うた}' } });
    expect(document.querySelectorAll('ruby').length).toBe(1);
    expect(screen.getByTestId('furigana-output').textContent).toContain('のうた');
  });

  it('shows no ruby for an empty field', () => {
    render(<FuriganaDemo />);
    fireEvent.change(field(), { target: { value: '' } });
    expect(document.querySelector('ruby')).toBeNull();
  });
});
