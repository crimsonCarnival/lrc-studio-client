import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import { THEMES } from './theme-options';

const LANG_NAMES: Record<string, Record<string, string>> = {
  en: { en: 'English', es: 'Inglés' },
  es: { en: 'Spanish', es: 'Español' },
};

const LANGUAGES = [
  { code: 'en', short: 'EN' },
  { code: 'es', short: 'ES' },
];

function getLangLabel(code: string, currentLang: string): string {
  const native = LANG_NAMES[code]?.[code] || code;
  const translated = LANG_NAMES[code]?.[currentLang];
  if (!translated || translated === native) return native;
  return `${native} (${translated})`;
}

const iconBtn = 'size-8 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors rounded-lg flex-shrink-0 cursor-pointer';

interface ThemeLangSwitcherProps {
  currentTheme: string;
  updateSetting?: (path: string, value: unknown) => void;
  i18n?: I18nInstance;
}

export function ThemeLangSwitcher({ currentTheme, updateSetting, i18n }: ThemeLangSwitcherProps) {
  const { t } = useTranslation();
  const currentLang = (i18n?.language || 'en').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center bg-zinc-900/60 border border-zinc-800/50 rounded-xl overflow-hidden">

      {/* Theme switcher — hidden on mobile (accessible via Settings) */}
      <Popover>
        <Tip content={t('settings.interface.theme')} side="bottom">
          <PopoverTrigger asChild>
            <button className={`${iconBtn} hidden sm:flex`} aria-label={t('settings.interface.theme')}>
              <Icon name={THEMES.find(t => t.id === currentTheme)?.iconName || 'dark_mode'} size={14} />
            </button>
          </PopoverTrigger>
        </Tip>
        <PopoverContent className="w-44 p-1" align="end" sideOffset={8}>
          {THEMES.map(({ id, label, swatch }) => (
            <PopoverItem
              key={id}
              onClick={() => updateSetting?.('interface.theme', id)}
              className={`flex items-center gap-2.5 cursor-pointer text-sm py-2 ${currentTheme === id ? 'text-primary' : ''}`}
            >
              <span className={`size-3 rounded-full shrink-0 ${swatch}`} />
              <span className="flex-1 text-left">{label}</span>
              <Icon name="check" size={12} className={`shrink-0 ${currentTheme === id ? 'text-primary' : 'invisible'}`} />
            </PopoverItem>
          ))}
        </PopoverContent>
      </Popover>

      <div className="hidden sm:block w-px h-4 bg-zinc-800/80 shrink-0" />

      {/* Language switcher */}
      <Popover>
        <Tip content={t('settings.interface.language')} side="bottom">
          <PopoverTrigger asChild>
            <button className={`${iconBtn} gap-0.5 w-auto px-2`} aria-label={t('settings.interface.language')}>
              <Icon name="language" size={14} className="shrink-0" />
              <span className="text-[10px] font-bold tracking-wide">{currentLang}</span>
            </button>
          </PopoverTrigger>
        </Tip>
        <PopoverContent className="w-48 p-1" align="end" sideOffset={8}>
          {LANGUAGES.map(({ code }) => {
            const lang = (i18n?.language || 'en').split('-')[0];
            const label = getLangLabel(code, lang);
            const active = lang === code;
            return (
              <PopoverItem
                key={code}
                onClick={() => i18n?.changeLanguage(code)}
                className={`flex items-center gap-2.5 cursor-pointer text-sm py-2 ${active ? 'text-primary' : ''}`}
              >
                <span className="flex-1 text-left">{label}</span>
                <Icon name="check" size={12} className={`shrink-0 ${active ? 'text-primary' : 'invisible'}`} />
              </PopoverItem>
            );
          })}
        </PopoverContent>
      </Popover>

    </div>
  );
}
