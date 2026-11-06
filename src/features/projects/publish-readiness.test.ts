import { describe, it, expect } from 'vitest';
import { getPublishReadiness } from './publish-readiness';
import type { EditorLine } from '@/features/editor/editor.types';

const meta = { title: 'Song', artists: ['Artist'], coverImage: 'https://x/c.jpg' };
const timed = (text: string, timestamp: number): EditorLine => ({ text, timestamp });

describe('getPublishReadiness', () => {
  it('does not count section markers', () => {
    const lines: EditorLine[] = [{ type: 'section', label: 'Verse' }, timed('a', 1), { text: 'b', timestamp: null }];
    expect(getPublishReadiness(lines, meta)).toMatchObject({ timed: 1, total: 2, complete: false, missing: ['lines'] });
  });

  it('is not complete for an empty project', () => {
    const r = getPublishReadiness([], meta);
    expect(r.complete).toBe(false);
    expect(r.total).toBe(0);
    expect(r.missing).toContain('lines');
  });

  it('is not complete for a project with only section markers', () => {
    expect(getPublishReadiness([{ type: 'section', label: 'x' }], meta).complete).toBe(false);
  });

  it('is complete when every lyric line is timed and the title is set', () => {
    expect(getPublishReadiness([timed('a', 1), timed('b', 2)], meta)).toEqual({ timed: 2, total: 2, complete: true, missing: [] });
  });

  it('reports a missing or blank title and blocks completion', () => {
    const lines = [timed('a', 1)];
    expect(getPublishReadiness(lines, { ...meta, title: '  ' })).toMatchObject({ complete: false, missing: ['title'] });
    expect(getPublishReadiness(lines, { ...meta, title: undefined }).missing).toEqual(['title']);
  });

  it('reports missing artist and cover without blocking', () => {
    const r = getPublishReadiness([timed('a', 1)], { title: 'Song', artists: [' '], coverImage: '' });
    expect(r.missing).toEqual(['artist', 'cover']);
    expect(r.complete).toBe(true);
  });

  it('treats a timestamp of 0 as timed', () => {
    expect(getPublishReadiness([timed('a', 0)], meta).complete).toBe(true);
  });
});
