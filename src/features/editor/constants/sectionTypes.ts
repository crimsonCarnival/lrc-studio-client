/**
 * Built-in song section presets.
 * Each entry needs an `id` (stored in line.label), a `labelKey` (i18n key),
 * and a `depth` hint:
 *   0 = structural root (Part, Act, Movement) — rendered large/prominent
 *   1 = regular section (Verse, Chorus, etc.) — rendered compact/indented
 */
export const SECTION_TYPES = [
  // ——— Structural (depth 0) ———
  { id: 'part',        labelKey: 'editor.sections.part',        depth: 0 },
  // ——— Standard (depth 1) ———
  { id: 'intro',       labelKey: 'editor.sections.intro',       depth: 1 },
  { id: 'verse',       labelKey: 'editor.sections.verse',       depth: 1 },
  { id: 'pre-chorus',  labelKey: 'editor.sections.preChorus',   depth: 1 },
  { id: 'chorus',      labelKey: 'editor.sections.chorus',      depth: 1 },
  { id: 'bridge',      labelKey: 'editor.sections.bridge',      depth: 1 },
  { id: 'interlude',   labelKey: 'editor.sections.interlude',   depth: 1 },
  { id: 'outro',       labelKey: 'editor.sections.outro',       depth: 1 },
];

/**
 * Returns the default depth for a given label string.
 * Falls back to 1 (child) for unknown labels.
 */
export function getDefaultDepthForLabel(label) {
  if (!label) return 1;
  const base = label.trim().toLowerCase().replace(/\s+\d+$/, '');
  const preset = SECTION_TYPES.find(s => s.id === base);
  return preset?.depth ?? 1;
}

/**
 * Title-cases a section label for raw-text serialization, e.g. "pre-chorus 2" → "Pre-Chorus 2".
 *
 * Deliberately locale-INDEPENDENT (unlike formatSectionLabel, which localizes via t()):
 * the emitted `[Label]` must round-trip back through parseSectionHeader to a label that
 * getDefaultDepthForLabel / formatSectionLabel still recognize — and those match against
 * lowercase English ids. Title-casing the canonical id keeps it matchable and idempotent.
 */
export function formatSectionLabelForSerialization(label) {
  if (!label) return '';
  return label
    .trim()
    .split(/(\s+|-)/) // keep separators so we can re-join verbatim
    .map((part) => (/^[\s-]+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

/**
 * Whether a label denotes an Intro section (ignoring any trailing serialized number).
 * Intro sections are treated as editor-only metadata and omitted from raw-text serialization.
 */
export function isIntroLabel(label) {
  if (!label) return false;
  return label.trim().toLowerCase().replace(/\s+\d+$/, '') === 'intro';
}

/**
 * Formats and localizes a section label, handling serialized numbers (e.g. "verse 2").
 */
export function formatSectionLabel(label, t) {
  if (!label) return t('editor.sectionDefault');
  
  const lower = label.trim().toLowerCase();
  
  // 1. Exact match
  const exactType = SECTION_TYPES.find(s => s.id === lower);
  if (exactType) return t(exactType.labelKey, exactType.id);

  // 2. Base match + number (e.g. "verse 2")
  const match = lower.match(/^(.+?)\s+(\d+)$/);
  if (match) {
    const baseType = SECTION_TYPES.find(s => s.id === match[1]);
    if (baseType) {
      return `${t(baseType.labelKey, baseType.id)} ${match[2]}`;
    }
  }

  // 3. Fallback to raw label
  return label;
}
