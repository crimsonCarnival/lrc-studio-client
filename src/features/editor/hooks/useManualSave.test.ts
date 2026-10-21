import { describe, it, expect } from 'vitest';
import { buildProjectPatch, updateServerSnapshot, type ProjectSnapshot } from './useManualSave';
import type { EditorLine } from '@/features/editor/services/editor.service';

// buildProjectPatch/buildLyricsPatch decide whether a save sends a full
// `sections` replace, a single positional line patch, or (since this file's
// fix) an array of positional line patches. Bugs here either silently
// corrupt the server's view of the project (wrong sectionIdx/lineIdx) or
// turn every multi-line edit back into a full-project upload — exactly the
// risk testing.md ranks #3, so this covers the shapes that actually matter
// rather than every line of the implementation.

const STATE = { syncMode: false, activeLineIndex: 0, playbackPosition: 0, playbackSpeed: 1 };

function line(text: string, timestamp: number | null = null): EditorLine {
  return { text, timestamp } as EditorLine;
}
function marker(label: string): EditorLine {
  return { type: 'section', label } as EditorLine;
}

/** A snapshot as updateServerSnapshot would build it, for a given flat line array. */
function snapshotFor(lines: EditorLine[], editorMode = 'lrc'): ProjectSnapshot {
  const ref = { current: null as ProjectSnapshot | null };
  updateServerSnapshot(ref, { title: 't', metadata: {}, state: STATE, editorMode, lines, uploadId: null });
  return ref.current!;
}

function patchFor(prevLines: EditorLine[], nextLines: EditorLine[], editorMode = 'lrc') {
  return buildProjectPatch({
    prevSnapshot: snapshotFor(prevLines, editorMode),
    title: 't',
    metadata: {},
    state: STATE,
    uploadId: null,
    editorMode,
    lines: nextLines,
  }).lyrics;
}

describe('buildProjectPatch — lyrics diffing', () => {
  it('no prior snapshot sends full sections', () => {
    const patch = buildProjectPatch({
      prevSnapshot: null,
      title: 't',
      metadata: {},
      state: STATE,
      uploadId: null,
      editorMode: 'lrc',
      lines: [line('a'), line('b')],
    }).lyrics;
    expect(patch?.sections).toBeDefined();
    expect(patch?.sectionIdx).toBeUndefined();
    expect(patch?.lines).toBeUndefined();
  });

  it('no changes sends no lyrics patch', () => {
    const lines = [line('a'), line('b')];
    expect(patchFor(lines, lines)).toBeUndefined();
  });

  it('exactly one changed line sends the single positional shape, not an array', () => {
    const prev = [line('a'), line('b'), line('c')];
    const next = [line('a'), line('B CHANGED'), line('c')];
    const patch = patchFor(prev, next);
    expect(patch?.sections).toBeUndefined();
    expect(patch?.lines).toBeUndefined();
    expect(patch).toMatchObject({ sectionIdx: 0, lineIdx: 1, line: { text: 'B CHANGED' } });
  });

  it('two or more changed lines, same count, no markers touched: positional array, not full sections', () => {
    const prev = [line('a'), line('b'), line('c'), line('d')];
    const next = [line('a'), line('B'), line('c'), line('D')];
    const patch = patchFor(prev, next);
    expect(patch?.sections).toBeUndefined();
    expect(patch?.lines).toEqual([
      { sectionIdx: 0, lineIdx: 1, line: expect.objectContaining({ text: 'B' }) },
      { sectionIdx: 0, lineIdx: 3, line: expect.objectContaining({ text: 'D' }) },
    ]);
  });

  it('maps sectionIdx correctly across explicit section markers', () => {
    const prev = [marker('Verse'), line('a'), line('b'), marker('Chorus'), line('c'), line('d')];
    const next = [marker('Verse'), line('A'), line('b'), marker('Chorus'), line('c'), line('D')];
    const patch = patchFor(prev, next);
    expect(patch?.lines).toEqual([
      { sectionIdx: 0, lineIdx: 0, line: expect.objectContaining({ text: 'A' }) },
      { sectionIdx: 1, lineIdx: 1, line: expect.objectContaining({ text: 'D' }) },
    ]);
  });

  it('a changed line count falls back to full sections even if other lines also changed', () => {
    const prev = [line('a'), line('b')];
    const next = [line('A'), line('b'), line('new')];
    const patch = patchFor(prev, next);
    expect(patch?.sections).toBeDefined();
    expect(patch?.lines).toBeUndefined();
  });

  it('a section-marker line in the changed set forces full sections, even with other changed lines', () => {
    const prev = [marker('Verse'), line('a'), line('b')];
    const next = [marker('Chorus'), line('A'), line('b')];
    const patch = patchFor(prev, next);
    expect(patch?.sections).toBeDefined();
    expect(patch?.lines).toBeUndefined();
  });

  it('an editorMode change rides on the single-line patch when exactly one line changed', () => {
    const prev = [line('a'), line('b')];
    const next = [line('A'), line('b')];
    const patch = patchFor(prev, next, 'lrc');
    const withModeChange = buildProjectPatch({
      prevSnapshot: snapshotFor(prev, 'lrc'),
      title: 't', metadata: {}, state: STATE, uploadId: null,
      editorMode: 'srt', lines: next,
    }).lyrics;
    expect(patch).not.toHaveProperty('editorMode');
    expect(withModeChange).toMatchObject({ editorMode: 'srt', sectionIdx: 0, lineIdx: 0 });
  });

  it('an editorMode change rides on the lines array when multiple lines changed', () => {
    const prev = [line('a'), line('b'), line('c')];
    const next = [line('A'), line('b'), line('C')];
    const patch = buildProjectPatch({
      prevSnapshot: snapshotFor(prev, 'lrc'),
      title: 't', metadata: {}, state: STATE, uploadId: null,
      editorMode: 'srt', lines: next,
    }).lyrics;
    expect(patch?.editorMode).toBe('srt');
    expect(patch?.lines).toHaveLength(2);
  });
});
