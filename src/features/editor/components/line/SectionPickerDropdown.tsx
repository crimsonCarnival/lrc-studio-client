import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SECTION_TYPES } from '@features/editor/constants/sectionTypes';

const STANDARD_TYPES = SECTION_TYPES.filter(s => s.depth !== 0);
const STANDARD_IDS = new Set(STANDARD_TYPES.map(s => s.id));

function resolvePreset(val: string | undefined | null): string | null {
  if (!val) return null;
  const lower = val.trim().toLowerCase();
  if (STANDARD_IDS.has(lower)) return lower;
  // "verse 2", "chorus 3", etc.
  const m = lower.match(/^(.+?)\s+\d+$/);
  if (m && STANDARD_IDS.has(m[1])) return m[1];
  return null;
}

interface SectionPickerDropdownProps {
  value?: string;
  onChange: (value: string) => void;
}

export default function SectionPickerDropdown({ value, onChange }: SectionPickerDropdownProps) {
  const { t } = useTranslation();
  // Section type labelKeys are sourced from constants; bypass strict key checking.
  const tk = t as (key: string, defaultValue?: string) => string;

  const preset = resolvePreset(value);
  const [selected, setSelected] = useState(preset ?? '__other__');
  const [customText, setCustomText] = useState(preset ? '' : (value || ''));

  const handlePreset = (id: string) => {
    setSelected(id);
    onChange(id);
  };

  const handleOtherClick = () => {
    setSelected('__other__');
    onChange(customText);
  };

  const handleCustomChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCustomText(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {STANDARD_TYPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handlePreset(s.id)}
            className={`px-2 py-0.5 text-xs rounded border transition-colors cursor-pointer
              ${selected === s.id
                ? 'bg-primary/20 border-primary/60 text-primary'
                : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100'
              }`}
          >
            {tk(s.labelKey, s.id)}
          </button>
        ))}
        <button
          type="button"
          onClick={handleOtherClick}
          className={`px-2 py-0.5 text-xs rounded border transition-colors cursor-pointer
            ${selected === '__other__'
              ? 'bg-primary/20 border-primary/60 text-primary'
              : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100'
            }`}
        >
          {t('editor.sections.other')}
        </button>
      </div>

      {selected === '__other__' && (
        <input
          type="text"
          value={customText}
          onChange={handleCustomChange}
          placeholder={t('editor.sectionLabelPlaceholder')}
          autoFocus
          className="text-xs px-2 py-0.5 rounded border bg-zinc-800 border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary/60 w-full min-w-[220px]"
        />
      )}
    </div>
  );
}
