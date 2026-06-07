import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SECTION_TYPES, SECTION_TYPE_IDS } from '@features/editor/constants/sectionTypes';
import { FloatingCombobox } from '@ui/floating-combobox';

/**
 * Compact section-type dropdown for the section-marker inline editor.
 *
 * Props:
 *   value      — current label string (a preset id or custom text)
 *   onChange   — (labelString) => void  called on every change
 *   projectSingers - Array of unique singers used in the project
 */
export default function SectionPickerDropdown({ value, onChange, projectSingers }) {
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

  const handleCustomChange = (v) => {
    setCustomText(v);
    onChange(v);
  };

  const selectValue = isOther ? '__other__' : (value || 'verse');

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={selectValue}
        onChange={handleSelectChange}
        className="bg-zinc-800 border border-zinc-600 text-xs text-zinc-200 rounded px-2 py-0.5 focus:outline-none focus:border-primary/60 cursor-pointer"
      >
        <optgroup label={t('editor.sections.groupStructural', 'Structural')}>
          {SECTION_TYPES.filter(s => s.depth === 0).map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.labelKey, s.id)}
            </option>
          ))}
        </optgroup>
        <optgroup label={t('editor.sections.groupStandard', 'Standard')}>
          {SECTION_TYPES.filter(s => s.depth !== 0).map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.labelKey, s.id)}
            </option>
          ))}
        </optgroup>
        <option value="__other__">{t('editor.sections.other', 'Other…')}</option>
      </select>

      {isOther && (
        <FloatingCombobox
          value={customText}
          onChange={handleCustomChange}
          options={projectSingers || []}
          placeholder={t('editor.sectionLabelPlaceholder', 'Section label')}
          className="w-28 text-xs h-6"
        />
      )}
    </div>
  );
}
