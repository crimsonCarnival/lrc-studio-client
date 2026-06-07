/**
 * Built-in song section presets.
 * Add new entries here to extend the section picker dropdown.
 * Each entry needs an `id` (stored in line.label) and a `labelKey` (i18n key).
 */
export const SECTION_TYPES = [
  { id: 'intro',       labelKey: 'editor.sections.intro'      },
  { id: 'verse',       labelKey: 'editor.sections.verse'      },
  { id: 'pre-chorus',  labelKey: 'editor.sections.preChorus'  },
  { id: 'chorus',      labelKey: 'editor.sections.chorus'     },
  { id: 'bridge',      labelKey: 'editor.sections.bridge'     },
  { id: 'interlude',   labelKey: 'editor.sections.interlude'  },
  { id: 'outro',       labelKey: 'editor.sections.outro'      },
];

/** IDs of the built-in presets, for quick lookup */
export const SECTION_TYPE_IDS = new Set(SECTION_TYPES.map(s => s.id));

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
