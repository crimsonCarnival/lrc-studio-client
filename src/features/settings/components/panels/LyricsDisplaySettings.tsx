import { useTranslation } from 'react-i18next';
import { Section, SettingRow, SegmentedControl, SettingSelect, SettingOption } from '../shared';
import { useInterfaceSettings } from '../../hooks/useInterfaceSettings';
import { Button } from '@ui/button';
import { ColorPicker } from '@ui/color-picker';
type SelectEvent = { target: { value: string } };

interface LyricsDisplaySettingsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: { interface?: Record<string, any>; editor?: Record<string, any>; [key: string]: any };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
}

// Illustrative sizing for the live preview; the real editor uses its own scale.
const PREVIEW_FONT: Record<string, number> = { small: 16, normal: 19, large: 23, xlarge: 28 };
const PREVIEW_GAP: Record<string, number> = { compact: 6, normal: 12, relaxed: 20 };
const PREVIEW_DIM: Record<string, number> = { off: 1, low: 0.65, medium: 0.4, high: 0.2 };

/** How lyrics look and move in the editor and the preview: size, contrast, highlight, karaoke fill, scrolling. */
export default function LyricsDisplaySettings({ settings, updateSetting, searchTerm }: LyricsDisplaySettingsProps) {
  const { t } = useTranslation();
  const tk = t as (key: string, opts?: Record<string, unknown>) => string;
  const {
    handleActiveHighlightChange,
    handleScrollModeChange,
    handleScrollAlignmentChange,
    handlePreviewAlignmentChange,
    handleFontSizeChange,
    handleSpacingChange,
    handleTranslationLayoutChange,
  } = useInterfaceSettings(updateSetting) as Record<string, (e: SelectEvent) => void>;

  const ui = settings.interface ?? {};
  const display = settings.editor?.display ?? {};
  const fontSize = ui.fontSize ?? 'normal';
  const spacing = ui.spacing ?? 'normal';
  const focusContrast = ui.focusContrast ?? 'medium';
  const previewAlignment = ui.previewAlignment ?? 'left';
  const highlight = display.activeHighlight ?? 'glow';
  const singerColors: string[] = display.singerColors ?? [];

  const seg = (key: string, value: string, items: [string, string][], onChange: (v: string) => void) => (
    <SegmentedControl label={key} value={value} options={items.map(([v, label]) => ({ value: v, label }))} onChange={onChange} />
  );

  return (
    <>
      <Section
        title={t('settings.interface.editorLyricsSection')}
        searchTerm={searchTerm}
        action={<span className="text-[13px] text-zinc-400">{t('settings.interface.previewLabel')}</span>}
      >
        <div
          aria-hidden="true"
          className="flex flex-col mt-2 mb-3 px-6 py-[22px] rounded-xl bg-zinc-950 border border-zinc-800 font-semibold"
          style={{ gap: PREVIEW_GAP[spacing] ?? 12, textAlign: previewAlignment, fontSize: PREVIEW_FONT[fontSize] ?? 19 }}
        >
          <div style={{ opacity: PREVIEW_DIM[focusContrast] ?? 0.4 }}>{t('settings.interface.previewPrev')}</div>
          <div className="text-white" style={{ textShadow: '0 0 18px var(--color-primary)' }}>{t('settings.interface.previewNow')}</div>
          <div style={{ opacity: PREVIEW_DIM[focusContrast] ?? 0.4 }}>{t('settings.interface.previewNext')}</div>
        </div>
        <SettingRow label={t('settings.interface.activeLineHighlight')}>
          <SettingSelect label={t('settings.interface.activeLineHighlight')} value={highlight} onValueChange={(val) => handleActiveHighlightChange({ target: { value: val } })}>
            <SettingOption value="glow">{t('settings.options.highlights.glow')}</SettingOption>
            <SettingOption value="zoom">{t('settings.options.highlights.zoom')}</SettingOption>
            <SettingOption value="color">{t('settings.options.highlights.color')}</SettingOption>
            <SettingOption value="dim">{t('settings.options.highlights.dim')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.interface.fontSize')}>
          {seg(t('settings.interface.fontSize'), fontSize, [
            ['small', t('settings.options.sizes.small')], ['normal', t('settings.options.sizes.normal')],
            ['large', t('settings.options.sizes.large')], ['xlarge', t('settings.options.sizes.xLarge')],
          ], (v) => handleFontSizeChange({ target: { value: v } }))}
        </SettingRow>
        <SettingRow label={t('settings.interface.spacing')}>
          {seg(t('settings.interface.spacing'), spacing, [
            ['compact', t('settings.options.spacing.compact')], ['normal', t('settings.options.spacing.normal')], ['relaxed', t('settings.options.spacing.relaxed')],
          ], (v) => handleSpacingChange({ target: { value: v } }))}
        </SettingRow>
        <SettingRow label={t('settings.interface.focusContrast')} description={t('settings.interface.focusContrastDesc')}>
          {seg(t('settings.interface.focusContrast'), focusContrast, [
            ['off', t('settings.options.contrasts.off')], ['low', t('settings.options.contrasts.low')],
            ['medium', t('settings.options.contrasts.medium')], ['high', t('settings.options.contrasts.high')],
          ], (v) => updateSetting('interface.focusContrast', v))}
        </SettingRow>
        <SettingRow label={t('settings.interface.previewAlignment')}>
          {seg(t('settings.interface.previewAlignment'), previewAlignment, [
            ['left', t('settings.interface.alignLeft')], ['center', t('settings.interface.alignCenter')], ['right', t('settings.interface.alignRight')],
          ], (v) => handlePreviewAlignmentChange({ target: { value: v } }))}
        </SettingRow>
        <SettingRow label={tk('settings.interface.singerColors')} description={tk('settings.interface.singerColorsDesc')}>
          <div className="flex flex-wrap items-end gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <label key={i} className="flex flex-col items-center gap-1 font-mono text-[11px] text-zinc-400">
                <ColorPicker
                  value={singerColors[i] || '#888888'}
                  onChange={(hex) => {
                    const next = [...(singerColors.length ? singerColors : Array(8).fill(''))];
                    next[i] = hex;
                    updateSetting('editor.display.singerColors', next);
                  }}
                  aria-label={t('editor.singerN', { n: i + 1 })}
                />
                {i + 1}
              </label>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => updateSetting('editor.display.singerColors', [])}
              className="ml-1.5"
            >
              {t('settings.interface.resetColors')}
            </Button>
          </div>
        </SettingRow>
      </Section>

      <Section title={t('settings.interface.scrollSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.interface.scrollBehavior')} description={t('settings.interface.scrollBehaviorDesc')}>
          <SettingSelect label={t('settings.interface.scrollBehavior')} value={settings.editor?.scroll?.mode ?? 'smooth'} onValueChange={(val) => handleScrollModeChange({ target: { value: val } })}>
            <SettingOption value="smooth">{t('settings.interface.scrollSmooth')}</SettingOption>
            <SettingOption value="instant">{t('settings.interface.scrollInstant')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.interface.scrollBlock')} description={t('settings.interface.scrollBlockDesc')}>
          <SettingSelect label={t('settings.interface.scrollBlock')} value={settings.editor?.scroll?.alignment ?? 'center'} onValueChange={(val) => handleScrollAlignmentChange({ target: { value: val } })}>
            <SettingOption value="center">{t('settings.interface.scrollCenter')}</SettingOption>
            <SettingOption value="nearest">{t('settings.interface.scrollNearest')}</SettingOption>
            <SettingOption value="start">{t('settings.interface.scrollTop')}</SettingOption>
            <SettingOption value="none">{t('settings.interface.scrollOff')}</SettingOption>
          </SettingSelect>
        </SettingRow>
      </Section>

      <Section title={t('settings.interface.lyricsSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.interface.translationLayout')} description={t('settings.interface.translationLayoutDesc')}>
          <SettingSelect label={t('settings.interface.translationLayout')} value={display.translationLayout ?? 'side-by-side'} onValueChange={(val) => handleTranslationLayoutChange({ target: { value: val } })}>
            <SettingOption value="stacked">{t('settings.interface.layoutStacked')}</SettingOption>
            <SettingOption value="side-by-side">{t('settings.interface.layoutSideBySide')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.interface.karaokeFillTrack')} description={t('settings.interface.karaokeFillTrackDesc')}>
          <SettingSelect label={t('settings.interface.karaokeFillTrack')} value={display.karaokeFillTrack ?? 'main'} onValueChange={(val) => updateSetting('editor.display.karaokeFillTrack', val)}>
            <SettingOption value="main">{t('settings.interface.fillTrackMain')}</SettingOption>
            <SettingOption value="secondary">{t('settings.interface.fillTrackSecondary')}</SettingOption>
            <SettingOption value="both">{t('settings.interface.fillTrackBoth')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.interface.karaokeFillEasing')} description={t('settings.interface.karaokeFillEasingDesc')}>
          <SettingSelect label={t('settings.interface.karaokeFillEasing')} value={display.karaokeFillEasing ?? 'linear'} onValueChange={(val) => updateSetting('editor.display.karaokeFillEasing', val)}>
            <SettingOption value="linear">{t('settings.interface.fillEasingLinear')}</SettingOption>
            <SettingOption value="ease-in-out">{t('settings.interface.fillEasingEaseInOut')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.interface.karaokeFillStyle')} description={t('settings.interface.karaokeFillStyleDesc')}>
          <SettingSelect label={t('settings.interface.karaokeFillStyle')} value={display.karaokeFillStyle === 'plain' ? 'plain' : 'glow'} onValueChange={(val) => updateSetting('editor.display.karaokeFillStyle', val)}>
            <SettingOption value="glow">{t('settings.interface.fillStyleGlow')}</SettingOption>
            <SettingOption value="plain">{t('settings.interface.fillStylePlain')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.interface.readingFormat')} description={t('settings.interface.readingFormatDesc')}>
          <SettingSelect label={t('settings.interface.readingFormat')} value={display.readingFormat ?? 'hiragana'} onValueChange={(val) => updateSetting('editor.display.readingFormat', val)}>
            <SettingOption value="hiragana">{t('editor.readingFormat.hiragana')}</SettingOption>
            <SettingOption value="katakana">{t('editor.readingFormat.katakana')}</SettingOption>
          </SettingSelect>
        </SettingRow>
      </Section>
    </>
  );
}
