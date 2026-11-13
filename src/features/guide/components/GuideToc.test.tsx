import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { GuideToc, TOC_HIDDEN_KEY } from './GuideToc';
import { GUIDE_SECTION_IDS } from '../guide-sections';

beforeEach(async () => {
  await i18n.changeLanguage('en');
  localStorage.clear();
});

describe('GuideToc', () => {
  it('lists every section under its group, in order', () => {
    render(<GuideToc activeId={null} />);
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(GUIDE_SECTION_IDS.map((id) => `#${id}`));
    expect(nav).toHaveTextContent('Basics');
    expect(nav).toHaveTextContent('Features');
  });

  it('marks the section being read', () => {
    render(<GuideToc activeId="words" />);
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    expect(nav.querySelector('a[aria-current="location"]')?.getAttribute('href')).toBe('#words');
  });

  it('hides and shows, and remembers the choice', () => {
    const { unmount } = render(<GuideToc activeId={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hide contents' }));
    expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
    expect(localStorage.getItem(TOC_HIDDEN_KEY)).toBe('1');
    unmount();

    render(<GuideToc activeId={null} />);
    expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show contents' }));
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
    expect(localStorage.getItem(TOC_HIDDEN_KEY)).toBeNull();
  });
});
