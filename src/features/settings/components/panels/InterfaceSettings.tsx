import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle } from '../shared';
import { useInterfaceSettings } from '../../hooks/useInterfaceSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
type SelectEvent = { target: { value: string } };

interface InterfaceSettingsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: { interface?: Record<string, any>; editor?: Record<string, any>; [key: string]: any };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
}

export default function InterfaceSettings({ settings, updateSetting, searchTerm }: InterfaceSettingsProps) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const {
    handleLanguageChange,
    handleActiveHighlightChange,
    handleScrollModeChange,
    handleScrollAlignmentChange,
    handlePreviewAlignmentChange,
    handleFontSizeChange,
    handleSpacingChange,
    handleTranslationLayoutChange,
    handleToastPositionChange,
  } = useInterfaceSettings(updateSetting) as Record<string, (e: SelectEvent) => void>;

  return (
    <>
      <Section title={t('settings.interface.generalSection')} iconName="desktop_windows" searchTerm={searchTerm}>
        <SettingRow iconName="language" label={t('settings.interface.language')} description={t('settings.interface.languageDesc')}>
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
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow iconName="lock" label={t('settings.interface.lockLayout')} description={t('settings.interface.lockLayoutDesc')}>
          <Toggle
            id="toggle-lock-layout"
            checked={settings.interface?.lockLayout ?? false}
            onChange={(v: boolean) => updateSetting('interface.lockLayout', v)}
          />
        </SettingRow>
        <SettingRow iconName="notifications" label={t('settings.interface.toastPosition')} description={t('settings.interface.toastPositionDesc')}>
          <Select
            value={settings.interface?.toastPosition ?? 'bottom-right'}
            onValueChange={(val) => handleToastPositionChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="bottom-left">{t('settings.options.positions.bottomLeft')}</SelectItem>
              <SelectItem value="bottom-center">{t('settings.options.positions.bottomCenter')}</SelectItem>
              <SelectItem value="bottom-right">{t('settings.options.positions.bottomRight')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </Section>

      <Section title={t('settings.interface.displaySection')} iconName="palette" searchTerm={searchTerm}>
        <SettingRow iconName="auto_awesome" label={t('settings.interface.activeLineHighlight')} description={t('settings.interface.activeLineHighlightDesc')}>
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
        <SettingRow iconName="text_fields" label={t('settings.interface.fontSize')} description={t('settings.interface.fontSizeDesc')}>
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
        <SettingRow iconName="table_rows" label={t('settings.interface.spacing')} description={t('settings.interface.spacingDesc')}>
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
        <SettingRow iconName="palette" label={tk('settings.interface.singerColors')} description={tk('settings.interface.singerColorsDesc')}>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <input
                  type="color"
                  value={settings.editor?.display?.singerColors?.[i] || '#888888'}
                  onChange={(e) => {
                    const newColors = [...(settings.editor?.display?.singerColors || Array(8).fill(''))];
                    newColors[i] = e.target.value;
                    updateSetting('editor.display.singerColors', newColors);
                  }}
                  className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                  title={t('editor.singerN', { n: i + 1 })}
                />
                <span className="text-[10px] text-zinc-500">{i + 1}</span>
              </div>
            ))}
          </div>
        </SettingRow>
      </Section>

      <Section title={t('settings.interface.scrollSection')} iconName="subject" searchTerm={searchTerm}>
        <SettingRow iconName="subject" label={t('settings.interface.scrollBehavior')} description={t('settings.interface.scrollBehaviorDesc')}>
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
        <SettingRow iconName="format_align_center" label={t('settings.interface.scrollBlock')} description={t('settings.interface.scrollBlockDesc')}>
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
        <SettingRow iconName="format_align_left" label={t('settings.interface.previewAlignment')} description={t('settings.interface.previewAlignmentDesc')}>
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

      <Section title={t('settings.interface.lyricsSection')} iconName="music_note" searchTerm={searchTerm}>
        <SettingRow iconName="view_list" label={t('settings.interface.dualLine')} description={t('settings.interface.dualLineDesc')}>
          <Toggle
            id="toggle-dual-line"
            checked={settings.editor?.display?.dualLine ?? false}
            onChange={(v: boolean) => updateSetting('editor.display.dualLine', v)}
          />
        </SettingRow>
        {(settings.editor?.display?.dualLine) && (
          <SettingRow iconName="expand_more" label={t('settings.interface.showNextLine')} description={t('settings.interface.showNextLineDesc')}>
            <Toggle
              id="toggle-show-next-line"
              checked={settings.editor?.display?.showNextLine ?? true}
              onChange={(v: boolean) => updateSetting('editor.display.showNextLine', v)}
            />
          </SettingRow>
        )}
        <SettingRow iconName="view_column" label={t('settings.interface.translationLayout')} description={t('settings.interface.translationLayoutDesc')}>
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
        <SettingRow iconName="auto_awesome" label={t('settings.interface.karaokeFillTrack')} description={t('settings.interface.karaokeFillTrackDesc')}>
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
        <SettingRow iconName="auto_awesome" label={t('settings.interface.karaokeFillEasing')} description={t('settings.interface.karaokeFillEasingDesc')}>
          <Select
            value={settings.editor?.display?.karaokeFillEasing ?? 'linear'}
            onValueChange={(val) => updateSetting('editor.display.karaokeFillEasing', val)}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="linear">{t('settings.interface.fillEasingLinear')}</SelectItem>
              <SelectItem value="ease-in-out">{t('settings.interface.fillEasingEaseInOut')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow iconName="menu_book" label={t('settings.interface.readingFormat')} description={t('settings.interface.readingFormatDesc')}>
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

      <Section title={t('settings.interface.previewSection')} iconName="view_column" searchTerm={searchTerm}>
        <SettingRow iconName="contrast" label={t('settings.interface.focusContrast')} description={t('settings.interface.focusContrastDesc')}>
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
