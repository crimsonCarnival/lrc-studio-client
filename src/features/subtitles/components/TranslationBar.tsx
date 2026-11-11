import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { FloatingCombobox } from '@/shared/ui/floating-combobox';
import { useLanguageOptions } from '@/features/editor/hooks/useLanguageOptions';
import type { TranslationSlot } from '../subtitle-bundle';

type TranslationBarProps = {
  languages: TranslationSlot[];
  onAdd: (label: string) => void;
  onRemove: (index: number) => void;
};

/** The project's translation languages as chips, and a way to add one. Each shows as a field under every subtitle. */
export function TranslationBar({ languages, onAdd, onRemove }: TranslationBarProps) {
  const { t } = useTranslation();
  const tx = t as (key: string, options?: Record<string, unknown>) => string;
  const options = useLanguageOptions();
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');

  const add = (label: string) => {
    onAdd(label);
    setValue('');
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">{t('editor.studio.translations')}</span>
      {languages.map((lang) => (
        <span key={lang.index} className="inline-flex h-8 items-center gap-1 rounded-full bg-zinc-800 pl-3 pr-1 text-xs font-semibold text-foreground">
          {lang.label}
          <button
            type="button"
            aria-label={tx('editor.studio.removeLanguage', { language: lang.label })}
            title={tx('editor.studio.removeLanguage', { language: lang.label })}
            onClick={() => onRemove(lang.index)}
            className="grid size-6 place-items-center rounded-full text-foreground/65 hover:bg-zinc-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Icon name="close" size={14} />
          </button>
        </span>
      ))}
      {adding ? (
        <div className="flex min-w-[200px] flex-1 items-center gap-1">
          <FloatingCombobox
            id="studio-add-language"
            label={t('editor.studio.addLanguage')}
            value={value}
            onChange={setValue}
            onSelect={add}
            options={options}
            maxLength={100}
            size="sm"
            className="flex-1"
          />
          <Button variant="ghost" size="icon" aria-label={t('common.cancel')} onClick={() => { setAdding(false); setValue(''); }} className="size-8 shrink-0">
            <Icon name="close" size={16} />
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)} className="h-8 gap-1.5 rounded-full border-dashed border-zinc-700 bg-transparent px-3 text-xs font-semibold text-foreground">
          <Icon name="add" size={14} />
          {t('editor.studio.addLanguage')}
        </Button>
      )}
    </div>
  );
}
