import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SECTION_TYPES, SECTION_TYPE_IDS } from '@features/editor/constants/sectionTypes';

/**
 * Compact section-type dropdown for the section-marker inline editor.
 *
 * Props:
 *   value      — current label string (a preset id or custom text)
 *   onChange   — (labelString) => void  called on every change
 */
export default function SectionPickerDropdown({ value, onChange }) {
  const { t } = useTranslation();

  // If the current value is not a known preset, start in "other" mode
  const [isOther, setIsOther] = useState(
    () => !!value && !SECTION_TYPE_IDS.has(value)
  );
  const [customText, setCustomText] = useState(
    () => (!!value && !SECTION_TYPE_IDS.has(value) ? value : '')
  );

  const handleSelectChange = (e) => {
    const v = e.target.value;
    if (v === '__other__') {
      setIsOther(true);
      // Keep the current custom text if we're switching back to other
      onChange(customText || '');
    } else {
      setIsOther(false);
      onChange(v);
    }
  };

  const handleCustomChange = (e) => {
    setCustomText(e.target.value);
    onChange(e.target.value);
  };

  const selectValue = isOther ? '__other__' : (value || 'verse');

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={selectValue}
        onChange={handleSelectChange}
        className="bg-zinc-800 border border-zinc-600 text-xs text-zinc-200 rounded px-2 py-0.5 focus:outline-none focus:border-primary/60 cursor-pointer"
      >
        {SECTION_TYPES.map((s) => (
          <option key={s.id} value={s.id}>
            {t(s.labelKey, s.id)}
          </option>
        ))}
        <option value="__other__">{t('editor.sections.other', 'Other…')}</option>
      </select>

      {isOther && (
        <input
          autoFocus
          value={customText}
          onChange={handleCustomChange}
          placeholder={t('editor.sectionLabelPlaceholder', 'Section label')}
          className="bg-zinc-800 border border-zinc-600 text-xs text-zinc-200 rounded px-2 py-0.5 w-28 focus:outline-none focus:border-primary/60"
        />
      )}
    </div>
  );
}
