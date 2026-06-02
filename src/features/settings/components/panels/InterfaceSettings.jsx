import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle } from '../shared';
import { useInterfaceSettings } from '../../hooks/useInterfaceSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Monitor, Moon, Sparkles, Globe, ScrollText, AlignCenter, AlignLeft, Type, Rows2, LayoutList, ChevronDown, Columns, BookOpen, Lock, Bell, Palette, Music, Contrast, Check } from 'lucide-react';

const THEMES = [
  { id: 'dark',   name: 'Moon',   bars: ['#232136','#c4a7e7','#9ccfd8'], bg: '#1a1826' },
  { id: 'light',  name: 'Dawn',   bars: ['#fffaf3','#b4637a','#286983'], bg: '#faf4ed', light: true },
  { id: 'cobalt', name: 'Cobalt', bars: ['#0F0D28','#2F2FE4','#4F9FFF'], bg: '#080616' },
  { id: 'velvet', name: 'Velvet', bars: ['#280a30','#A64D79','#dea0c0'], bg: '#180a1e' },
  { id: 'sage',   name: 'Sage',   bars: ['#182d1d','#5C8374','#9dc8bb'], bg: '#0c1710' },
  { id: 'system', name: 'System', bars: null, bg: null },
];

function ThemeSwatch({ theme, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(theme.id)}
      className={`relative rounded-xl overflow-hidden border-2 transition-all duration-150 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
        active ? 'border-primary shadow-[0_0_0_1px_rgba(196,167,231,.2)]' : 'border-transparent hover:border-zinc-600/50'
      }`}
    >
      {/* Preview */}
      <div
        className="h-[48px] flex items-end gap-[3px] p-[7px]"
        style={{ background: theme.bg ?? 'transparent' }}
      >
        {theme.bars ? (
          theme.bars.map((c, i) => (
            <div key={i} className="flex-1 rounded-[3px]" style={{ background: c, height: `${65 + i * 15}%` }} />
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Monitor className="size-4 text-zinc-500" />
          </div>
        )}
      </div>
      {/* Label */}
      <div
        className={`text-[10.5px] font-medium text-center py-[5px] ${
          theme.light ? 'bg-black/[0.06] text-[#575279]' : 'bg-black/25 text-zinc-400'
        } ${active ? 'text-primary' : ''}`}
      >
        {theme.name}
      </div>
      {/* Active checkmark */}
      {active && (
        <div className="absolute top-[5px] right-[5px] size-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="size-2.5 text-zinc-950" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

export default function InterfaceSettings({ settings, updateSetting, searchTerm }) {
  const { t } = useTranslation();
  const {
    handleLanguageChange,
    handleThemeChange,
    handleActiveHighlightChange,
    handleScrollModeChange,
    handleScrollAlignmentChange,
    handlePreviewAlignmentChange,
    handleFontSizeChange,
    handleSpacingChange,
    handleTranslationLayoutChange,
    handleToastPositionChange,
  } = useInterfaceSettings(updateSetting);

  return (
    <>
      <Section title={t('settings.interface.generalSection') || 'General'} icon={Monitor} searchTerm={searchTerm}>
        {/* Theme — full-width swatch grid, not a SettingRow */}
        <div className="px-5 py-4 [&+*]:border-t [&+*]:border-border/40">
          <p className="text-[11.5px] font-semibold text-zinc-400 mb-3">{t('settings.interface.theme')}</p>
          <div className="grid grid-cols-3 gap-2.5">
            {THEMES.map(theme => (
              <ThemeSwatch
                key={theme.id}
                theme={theme}
                active={(settings.interface?.theme ?? 'dark') === theme.id}
                onSelect={(val) => handleThemeChange({ target: { value: val } })}
              />
            ))}
          </div>
        </div>
        <SettingRow icon={Globe} label={t('settings.interface.language')} description={t('settings.interface.languageDesc')}>
          <Select
            value={settings.interface?.defaultLanguage ?? 'en'}
            onValueChange={(val) => handleLanguageChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="en">{t('common.language.en')}</SelectItem>
              <SelectItem value="es">{t('common.language.es')}</SelectItem>
              <SelectItem value="ja">{t('common.language.ja')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={Lock} label={t('settings.interface.lockLayout')} description={t('settings.interface.lockLayoutDesc')}>
          <Toggle
            id="toggle-lock-layout"
            checked={settings.interface?.lockLayout ?? false}
            onChange={(v) => updateSetting('interface.lockLayout', v)}
          />
        </SettingRow>
        <SettingRow icon={Bell} label={t('settings.interface.toastPosition') || 'Toast Position'} description={t('settings.interface.toastPositionDesc') || 'Controls where notifications appear on the screen'}>
          <Select
            value={settings.interface?.toastPosition ?? 'bottom-right'}
            onValueChange={(val) => handleToastPositionChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="bottom-left">{t('settings.options.positions.bottomLeft') || 'Bottom Left'}</SelectItem>
              <SelectItem value="bottom-center">{t('settings.options.positions.bottomCenter') || 'Bottom Center'}</SelectItem>
              <SelectItem value="bottom-right">{t('settings.options.positions.bottomRight') || 'Bottom Right'}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </Section>

      <Section title={t('settings.interface.displaySection') || 'Editor Display'} icon={Palette} searchTerm={searchTerm}>
        <SettingRow icon={Sparkles} label={t('settings.interface.activeLineHighlight')} description={t('settings.interface.activeLineHighlightDesc')}>
          <Select
            value={settings.editor?.display?.activeHighlight ?? 'glow'}
            onValueChange={(val) => handleActiveHighlightChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="glow">{t('settings.options.highlights.glow')}</SelectItem>
              <SelectItem value="zoom">{t('settings.options.highlights.zoom')}</SelectItem>
              <SelectItem value="color">{t('settings.options.highlights.color')}</SelectItem>
              <SelectItem value="dim">{t('settings.options.highlights.dim')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={Type} label={t('settings.interface.fontSize')} description={t('settings.interface.fontSizeDesc')}>
          <Select
            value={settings.interface?.fontSize ?? 'normal'}
            onValueChange={(val) => handleFontSizeChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="small">{t('settings.options.sizes.small')}</SelectItem>
              <SelectItem value="normal">{t('settings.options.sizes.normal')}</SelectItem>
              <SelectItem value="large">{t('settings.options.sizes.large')}</SelectItem>
              <SelectItem value="xlarge">{t('settings.options.sizes.xLarge')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={Rows2} label={t('settings.interface.spacing')} description={t('settings.interface.spacingDesc')}>
          <Select
            value={settings.interface?.spacing ?? 'normal'}
            onValueChange={(val) => handleSpacingChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="compact">{t('settings.options.spacing.compact')}</SelectItem>
              <SelectItem value="normal">{t('settings.options.spacing.normal')}</SelectItem>
              <SelectItem value="relaxed">{t('settings.options.spacing.relaxed')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </Section>

      <Section title={t('settings.interface.scrollSection') || 'Scrolling & Alignment'} icon={ScrollText} searchTerm={searchTerm}>
        <SettingRow icon={ScrollText} label={t('settings.interface.scrollBehavior')} description={t('settings.interface.scrollBehaviorDesc')}>
          <Select
            value={settings.editor?.scroll?.mode ?? 'smooth'}
            onValueChange={(val) => handleScrollModeChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="smooth">{t('settings.interface.scrollSmooth')}</SelectItem>
              <SelectItem value="instant">{t('settings.interface.scrollInstant')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={AlignCenter} label={t('settings.interface.scrollBlock')} description={t('settings.interface.scrollBlockDesc')}>
          <Select
            value={settings.editor?.scroll?.alignment ?? 'center'}
            onValueChange={(val) => handleScrollAlignmentChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="center">{t('settings.interface.scrollCenter')}</SelectItem>
              <SelectItem value="nearest">{t('settings.interface.scrollNearest')}</SelectItem>
              <SelectItem value="start">{t('settings.interface.scrollTop')}</SelectItem>
              <SelectItem value="none">{t('settings.interface.scrollOff')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={AlignLeft} label={t('settings.interface.previewAlignment')} description={t('settings.interface.previewAlignmentDesc')}>
          <Select
            value={settings.interface?.previewAlignment ?? 'left'}
            onValueChange={(val) => handlePreviewAlignmentChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="left">{t('settings.interface.alignLeft')}</SelectItem>
              <SelectItem value="center">{t('settings.interface.alignCenter')}</SelectItem>
              <SelectItem value="right">{t('settings.interface.alignRight')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </Section>

      <Section title={t('settings.interface.lyricsSection') || 'Lyrics & Translations'} icon={Music} searchTerm={searchTerm}>
        <SettingRow icon={LayoutList} label={t('settings.interface.dualLine')} description={t('settings.interface.dualLineDesc')}>
          <Toggle
            id="toggle-dual-line"
            checked={settings.editor?.display?.dualLine ?? false}
            onChange={(v) => updateSetting('editor.display.dualLine', v)}
          />
        </SettingRow>
        {(settings.editor?.display?.dualLine) && (
          <SettingRow icon={ChevronDown} label={t('settings.interface.showNextLine')} description={t('settings.interface.showNextLineDesc')}>
            <Toggle
              id="toggle-show-next-line"
              checked={settings.editor?.display?.showNextLine ?? true}
              onChange={(v) => updateSetting('editor.display.showNextLine', v)}
            />
          </SettingRow>
        )}
        <SettingRow icon={Columns} label={t('settings.interface.translationLayout')} description={t('settings.interface.translationLayoutDesc')}>
          <Select
            value={settings.editor?.display?.translationLayout ?? 'side-by-side'}
            onValueChange={(val) => handleTranslationLayoutChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="stacked">{t('settings.interface.layoutStacked')}</SelectItem>
              <SelectItem value="side-by-side">{t('settings.interface.layoutSideBySide')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={Sparkles} label={t('settings.interface.karaokeFillTrack')} description={t('settings.interface.karaokeFillTrackDesc')}>
          <Select
            value={settings.editor?.display?.karaokeFillTrack ?? 'main'}
            onValueChange={(val) => updateSetting('editor.display.karaokeFillTrack', val)}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="main">{t('settings.interface.fillTrackMain')}</SelectItem>
              <SelectItem value="secondary">{t('settings.interface.fillTrackSecondary')}</SelectItem>
              <SelectItem value="both">{t('settings.interface.fillTrackBoth')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={Sparkles} label={t('settings.interface.karaokeFillEasing') || 'Fill Easing'} description={t('settings.interface.karaokeFillEasingDesc') || 'Controls how the karaoke fill animates across each word'}>
          <Select
            value={settings.editor?.display?.karaokeFillEasing ?? 'linear'}
            onValueChange={(val) => updateSetting('editor.display.karaokeFillEasing', val)}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="linear">{t('settings.interface.fillEasingLinear') || 'Linear (Accurate)'}</SelectItem>
              <SelectItem value="ease-in-out">{t('settings.interface.fillEasingEaseInOut') || 'Ease In/Out (Smooth)'}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={BookOpen} label={t('settings.interface.readingFormat')} description={t('settings.interface.readingFormatDesc')}>
          <Select
            value={settings.editor?.display?.readingFormat ?? 'hiragana'}
            onValueChange={(val) => updateSetting('editor.display.readingFormat', val)}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="hiragana">{t('editor.readingFormat.hiragana')}</SelectItem>
              <SelectItem value="katakana">{t('editor.readingFormat.katakana')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </Section>

      <Section title={t('settings.interface.previewSection') || 'Preview'} icon={Columns} searchTerm={searchTerm}>
        <SettingRow icon={Contrast} label={t('settings.interface.focusContrast')} description={t('settings.interface.focusContrastDesc')}>
          <Select
            value={settings.interface?.focusContrast ?? 'medium'}
            onValueChange={(val) => updateSetting('interface.focusContrast', val)}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="off">{t('settings.options.contrasts.off')}</SelectItem>
              <SelectItem value="low">{t('settings.options.contrasts.low')}</SelectItem>
              <SelectItem value="medium">{t('settings.options.contrasts.medium')}</SelectItem>
              <SelectItem value="high">{t('settings.options.contrasts.high')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </Section>
    </>
  );
}
