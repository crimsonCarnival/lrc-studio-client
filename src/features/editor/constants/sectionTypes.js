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
