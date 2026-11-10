import { describe, expect, it } from 'vitest';
import { pageCount, pageRange, pageWindow, parseOption, parsePage } from './list-pager';

describe('pageCount', () => {
  it('rounds up and never drops below one page', () => {
    expect(pageCount(24, 6)).toBe(4);
    expect(pageCount(25, 6)).toBe(5);
    expect(pageCount(0, 6)).toBe(1);
    expect(pageCount(-3, 6)).toBe(1);
    expect(pageCount(Number.NaN, 6)).toBe(1);
  });
});

describe('pageWindow', () => {
  it('lists every page when there are few', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('collapses the far side into a gap', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 'gap', 20]);
    expect(pageWindow(20, 20)).toEqual([1, 'gap', 19, 20]);
  });

  it('keeps siblings around the current page with gaps on both sides', () => {
    expect(pageWindow(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
  });

  it('shows a lone hidden page instead of a gap', () => {
    expect(pageWindow(4, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
    expect(pageWindow(17, 20)).toEqual([1, 'gap', 16, 17, 18, 19, 20]);
  });

  it('clamps an out-of-range current page', () => {
    expect(pageWindow(99, 20)).toEqual([1, 'gap', 19, 20]);
    expect(pageWindow(0, 20)).toEqual([1, 2, 'gap', 20]);
  });
});

describe('parsePage', () => {
  it('accepts positive integers', () => {
    expect(parsePage('1')).toBe(1);
    expect(parsePage('12')).toBe(12);
  });

  it('falls back to page 1 for anything else', () => {
    for (const raw of [null, undefined, '', '0', '-2', '1.5', 'abc', '2e3', ' 3', '99999999999999999999']) {
      expect(parsePage(raw)).toBe(1);
    }
  });
});

describe('parseOption', () => {
  const SORTS = ['UPDATED', 'NEWEST'] as const;
  it('keeps allowed values and replaces the rest', () => {
    expect(parseOption('NEWEST', SORTS, 'UPDATED')).toBe('NEWEST');
    expect(parseOption('newest', SORTS, 'UPDATED')).toBe('UPDATED');
    expect(parseOption(null, SORTS, 'UPDATED')).toBe('UPDATED');
  });
});

describe('pageRange', () => {
  it('gives the 1-based range of the items shown', () => {
    expect(pageRange(1, 6, 6)).toEqual({ from: 1, to: 6 });
    expect(pageRange(4, 6, 3)).toEqual({ from: 19, to: 21 });
    expect(pageRange(2, 6, 0)).toBeNull();
  });
});
