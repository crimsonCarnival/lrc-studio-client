import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { THEMES, LANGUAGES, getLangLabel } from './theme-options';
import ThemeModal from '@/features/settings/components/theme/ThemeModal';

interface ThemeLangSwitcherProps {
  currentTheme: string;
  /** JSON of the user's own theme (`interface.customTheme`), for the theme modal's editor. */
  customTheme?: string;
  updateSetting?: (path: string, value: unknown) => void;
  i18n?: I18nInstance;
}

export function ThemeLangSwitcher({ currentTheme, customTheme, updateSetting, i18n }: ThemeLangSwitcherProps) {
  const { t } = useTranslation();
  const [themeOpen, setThemeOpen] = useState(false);
  const currentLang = (i18n?.language || 'en').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center bg-zinc-900/60 border border-zinc-800/50 rounded-xl overflow-hidden">

      {/* Theme switcher: opens the same selector the settings page shows. Hidden on mobile (accessible via Settings). */}
      <Tip content={t('settings.interface.theme')} side="bottom">
        <Button
          variant="ghost"
          size="icon"
          className="hidden size-8 sm:inline-flex lg:size-8 coarse:size-11"
          aria-label={t('settings.interface.theme')}
          onClick={() => setThemeOpen(true)}
        >
          <Icon name={THEMES.find(t => t.id === currentTheme)?.iconName || 'palette'} size={14} />
        </Button>
      </Tip>
      <ThemeModal
        open={themeOpen}
        onOpenChange={setThemeOpen}
        settings={{ interface: { theme: currentTheme, customTheme } }}
        updateSetting={(path, value) => updateSetting?.(path, value)}
      />

      <div className="hidden sm:block w-px h-4 bg-zinc-800/80 shrink-0" />

      {/* Language switcher */}
      <Popover>
        <Tip content={t('settings.interface.language')} side="bottom">
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-0.5 px-2 text-subtle lg:h-8 lg:px-2 coarse:h-11" aria-label={t('settings.interface.language')}>
              <Icon name="language" size={14} className="shrink-0" />
              <span className="text-[10px] font-bold tracking-wide">{currentLang}</span>
            </Button>
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
