/**
 * Pure text operations backing the Raw Lyrics selection toolbar.
 *
 * The paste area is a plain textarea (a single string), so every structural
 * action (create section, set depth, assign section singers) must round-trip
 * through the `[Label | A, B]` header syntax that parseSectionHeader understands.
 * Section depth has no token of its own — it is encoded as leading indentation
 * on the header line (depth 0 = main/flush, depth 1 = regular/indented), matching
 * linesToRawText. These helpers keep that encoding in one place and operate on a
 * line array so callers never juggle char offsets.
 */
import { parseSectionHeader } from './sections';
import { formatSectionLabelForSerialization } from '../constants/sectionTypes';

export interface LineSelection {
  lines: string[];
  startLine: number;
  endLine: number;
}

/**
 * Map a [start, end] char-offset selection in `value` to an inclusive line-index
 * range. A selection that ends exactly at a line boundary (common when selecting
 * whole lines) does not pull in the trailing empty line.
 */
export function selectionToLineRange(value: string, start: number, end: number): LineSelection {
  const lines = value.split('\n');
  const lineStarts: number[] = [];
  let off = 0;
  for (const l of lines) {
    lineStarts.push(off);
    off += l.length + 1; // + newline
  }
  const lineOf = (pos: number) => {
    let idx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (pos >= lineStarts[i]) idx = i;
      else break;
    }
    return idx;
  };
  let endLine = lineOf(end);
  const startLine = lineOf(start);
  if (endLine > startLine && end === lineStarts[endLine]) endLine--;
  return { lines, startLine, endLine };
}

export function isHeaderLine(line: string): boolean {
  return parseSectionHeader(line) !== null;
}

/** Index of the section header governing `startLine` (nearest header at/above it), or -1. */
export function governingHeaderIndex(lines: string[], startLine: number): number {
  for (let i = startLine; i >= 0; i--) {
    if (isHeaderLine(lines[i])) return i;
  }
  return -1;
}

/**
 * Header index the section-scoped actions (depth, singers) should target:
 * - exactly one header inside the selection → that header
 * - none inside → the governing header above the selection
 * - more than one header inside → -1 (ambiguous; caller disables those actions)
 */
export function targetHeaderIndex(lines: string[], startLine: number, endLine: number): number {
  const inRange: number[] = [];
  for (let i = startLine; i <= endLine; i++) {
    if (isHeaderLine(lines[i])) inRange.push(i);
  }
  if (inRange.length > 1) return -1;
  if (inRange.length === 1) return inRange[0];
  return governingHeaderIndex(lines, startLine);
}

/** Serialize a section header line: `[Label]`, `[Label | A, B]`, indented when depth > 0. */
export function buildHeaderLine(label: string, singers: string[], depth: number): string {
  const display = formatSectionLabelForSerialization(label);
  const indent = depth > 0 ? '  ' : '';
  const cleaned = singers.map((s) => s.trim()).filter(Boolean);
  return cleaned.length ? `${indent}[${display} | ${cleaned.join(', ')}]` : `${indent}[${display}]`;
}

/** Insert a new section header line before `atLine`. */
export function insertSectionAt(lines: string[], atLine: number, label: string, depth: number): string[] {
  return [...lines.slice(0, atLine), buildHeaderLine(label, [], depth), ...lines.slice(atLine)];
}

/** Rewrite the header at `idx` with a new depth, preserving its label and singers. */
export function setHeaderDepth(lines: string[], idx: number, depth: number): string[] {
  const parsed = parseSectionHeader(lines[idx]);
  if (!parsed) return lines;
  const next = [...lines];
  next[idx] = buildHeaderLine(parsed.label, parsed.singers, depth);
  return next;
}

/**
 * Rewrite the header at `idx` with a new singer roster, preserving its depth and
 * its clean label. parseSectionHeader already splits the `[Verse: Papa Pine]`
 * colon form, so re-serializing won't bake ": Papa Pine" into the label.
 */
export function setHeaderSingers(lines: string[], idx: number, singers: string[]): string[] {
  const parsed = parseSectionHeader(lines[idx]);
  if (!parsed) return lines;
  const next = [...lines];
  next[idx] = buildHeaderLine(parsed.label, singers, parsed.depth);
  return next;
}
