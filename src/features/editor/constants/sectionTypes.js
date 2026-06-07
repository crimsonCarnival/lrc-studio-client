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

/** IDs of depth-0 (root/structural) presets */
export const ROOT_SECTION_IDS = new Set(SECTION_TYPES.filter(s => s.depth === 0).map(s => s.id));

/** IDs of all built-in presets */
export const SECTION_TYPE_IDS = new Set(SECTION_TYPES.map(s => s.id));

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
 * Formats and localizes a section label, handling serialized numbers (e.g. "verse 2").
 */
export function formatSectionLabel(label, t) {
  if (!label) return t('editor.sectionDefault', 'Section');
  
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
