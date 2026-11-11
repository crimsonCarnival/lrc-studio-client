import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import SyncDemo from './SyncDemo';

beforeEach(async () => { await i18n.changeLanguage('en'); });

const stampedCount = () => document.querySelectorAll('[data-stamped="true"]').length;

describe('SyncDemo', () => {
  it('stamps the active line on Space while the demo is focused', () => {
    render(<SyncDemo />);
    const demo = screen.getByRole('group');
    demo.focus();
    fireEvent.keyDown(demo, { key: ' ' });
    expect(stampedCount()).toBe(1);
  });

  it('ignores Space pressed on the page body', () => {
    render(<SyncDemo />);
    fireEvent.keyDown(document.body, { key: ' ' });
    expect(stampedCount()).toBe(0);
  });

  it('stamps through the Mark button and clears with Reset', () => {
    render(<SyncDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark' }));
    expect(stampedCount()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(stampedCount()).toBe(0);
  });
});
