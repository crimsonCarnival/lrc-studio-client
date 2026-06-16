/**
 * Conversion between the flat internal editor representation (lines[]) and
 * the nested DB representation (sections[]).
 *
 * Flat format: [{type:'section', label, depth, singers, ...}, {text,...}, ...]
 * Nested format: [{label, depth, singers, lines:[{text,...},...]}]
 */

/**
 * Convert client flat lines array to nested sections.
 * Lines before the first section marker are grouped into an anonymous section.
 */
export function flatToSections(lines) {
  const sections = [];
  let current = null;

  for (const line of lines ?? []) {
    if (line?.type === 'section') {
      if (current) sections.push(current);
      current = {
        label: line.label ?? null,
        depth: line.depth ?? null,
        id: line.id ?? null,
        singers: Array.isArray(line.singers) ? line.singers : undefined,
        timestamp: typeof line.timestamp === 'number' ? line.timestamp : null,
        lines: [],
      };
    } else if (line) {
      if (!current) current = { label: null, depth: null, id: null, singers: undefined, timestamp: null, lines: [] };
      // Strip section-only fields from line entries
      const { type: _t, label: _l, depth: _d, ...rest } = line;
      current.lines.push(rest);
    }
  }
  if (current) sections.push(current);
  return sections;
}

/**
 * Convert nested sections back to flat lines (with section marker objects).
 */
export function sectionsToFlat(sections) {
  const flat = [];
  for (const sec of sections ?? []) {
    // Anonymous sections (implicit grouping for lines before any explicit section marker)
    // have no label, depth, id, or singers — skip the marker so they don't appear in the editor.
    const isAnonymous = sec.label == null && sec.depth == null && sec.id == null &&
      (!Array.isArray(sec.singers) || sec.singers.length === 0);
    if (!isAnonymous) {
      flat.push({
        type: 'section',
        label: sec.label ?? null,
        depth: sec.depth ?? null,
        id: sec.id ?? null,
        singers: sec.singers,
        timestamp: sec.timestamp ?? null,
        text: '',
      });
    }
    for (const line of sec.lines ?? []) {
      flat.push(line);
    }
  }
  return flat;
}

/**
 * Given the flat lines array and a flat index, return {sectionIdx, lineIdx}
 * pointing into the sections structure that flatToSections() would produce.
 * Returns null if the index points to a section marker (not a regular line).
 */
export function flatIndexToSectionPos(lines, flatIdx) {
  // Mirror flatToSections exactly: sections[0] is the implicit anonymous
  // section when lines start before any explicit section marker — those lines
  // must map to sectionIdx 0, not -1.
  let sectionCount = 0;   // sections pushed so far (= index of current section)
  let hasSection = false; // whether a section (implicit or explicit) has started
  let lineCounter = 0;

  for (let i = 0; i <= flatIdx; i++) {
    const line = lines[i];
    if (line?.type === 'section') {
      if (hasSection) sectionCount++; // complete previous section → next starts
      hasSection = true;
      lineCounter = 0;
      if (i === flatIdx) return null; // section marker itself — not patchable
    } else if (line) {
      if (!hasSection) hasSection = true; // implicit anonymous section[0]
      if (i === flatIdx) return { sectionIdx: sectionCount, lineIdx: lineCounter };
      lineCounter++;
    }
  }
  return null;
}

/**
 * Return the singers[] of the section that contains lines[lineIdx].
 * Used to restrict singer picker options to the parent section's roster.
 */
function getParentSectionSingers(lines, lineIdx) {
  for (let i = lineIdx; i >= 0; i--) {
    if (lines[i]?.type === 'section') {
      return Array.isArray(lines[i].singers) ? lines[i].singers : [];
    }
  }
  return [];
}

/**
 * Validate that all singers assigned to a line exist in their parent section.
 * Returns an array of invalid singer names (empty = valid).
 */
export function validateLineSingers(lines, lineIdx) {
  const line = lines[lineIdx];
  if (!line || !Array.isArray(line.singers) || line.singers.length === 0) return [];
  const allowed = new Set(getParentSectionSingers(lines, lineIdx));
  if (allowed.size === 0) return []; // section has no singer roster → no restriction
  return line.singers.filter((s) => !allowed.has(s));
}

/**
 * Singer options to offer for a bulk-assignment picker covering `indices`.
 * Restricts to the parent section's roster only when every selected line
 * shares the same non-empty roster — a mixed selection can't be restricted
 * to a single roster safely, so it falls back to the full song-wide list.
 */
export function getSingerOptionsForSelection(lines, indices, songArtists) {
  const rosters = indices.map((idx) => getParentSectionSingers(lines, idx));
  const first = rosters[0] || [];
  if (first.length === 0) return songArtists || [];
  const sameForAll = rosters.every((r) => r.length === first.length && r.every((s, i) => s === first[i]));
  return sameForAll ? first : (songArtists || []);
}
