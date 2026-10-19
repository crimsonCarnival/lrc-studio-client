import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle, SegmentedControl, SettingSelect, SettingOption } from '../shared';
import { useInterfaceSettings } from '../../hooks/useInterfaceSettings';
import { cn } from '@/shared/utils/utils';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
type SelectEvent = { target: { value: string } };

interface InterfaceSettingsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: { interface?: Record<string, any>; editor?: Record<string, any>; [key: string]: any };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
}

const TOAST_POSITIONS = [
  { value: 'top-left', labelKey: 'topLeft', v: 'items-start', h: 'justify-start' },
  { value: 'top-center', labelKey: 'topCenter', v: 'items-start', h: 'justify-center' },
  { value: 'top-right', labelKey: 'topRight', v: 'items-start', h: 'justify-end' },
  { value: 'bottom-left', labelKey: 'bottomLeft', v: 'items-end', h: 'justify-start' },
  { value: 'bottom-center', labelKey: 'bottomCenter', v: 'items-end', h: 'justify-center' },
  { value: 'bottom-right', labelKey: 'bottomRight', v: 'items-end', h: 'justify-end' },
] as const;

// Illustrative sizing for the live preview; the real editor uses its own scale.
const PREVIEW_FONT: Record<string, number> = { small: 16, normal: 19, large: 23, xlarge: 28 };
const PREVIEW_GAP: Record<string, number> = { compact: 6, normal: 12, relaxed: 20 };
const PREVIEW_DIM: Record<string, number> = { off: 1, low: 0.65, medium: 0.4, high: 0.2 };

export default function InterfaceSettings({ settings, updateSetting, searchTerm }: InterfaceSettingsProps) {
  const { t } = useTranslation();
  const tk = t as (key: string, opts?: Record<string, unknown>) => string;
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

  const ui = settings.interface ?? {};
  const display = settings.editor?.display ?? {};
  const fontSize = ui.fontSize ?? 'normal';
  const fontWeight = ui.fontWeight ?? 'normal';
  const spacing = ui.spacing ?? 'normal';
  const focusContrast = ui.focusContrast ?? 'medium';
  const previewAlignment = ui.previewAlignment ?? 'left';
  const toastPosition = ui.toastPosition ?? 'bottom-right';
  const highlight = display.activeHighlight ?? 'glow';
  const toastLabel = tk(`settings.options.positions.${TOAST_POSITIONS.find((p) => p.value === toastPosition)?.labelKey ?? 'bottomRight'}`);
  const dualLine = display.dualLine ?? false;
  const singerColors: string[] = display.singerColors ?? [];

  const seg = (key: string, value: string, items: [string, string][], onChange: (v: string) => void) => (
    <SegmentedControl label={key} value={value} options={items.map(([v, label]) => ({ value: v, label }))} onChange={onChange} />
  );

  return (
    <>
      <Section title={t('settings.interface.generalSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.interface.language')} description={t('settings.interface.languageDesc')}>
          <SettingSelect label={t('settings.interface.language')} value={ui.defaultLanguage ?? 'en'} onValueChange={(val) => handleLanguageChange({ target: { value: val } })}>
            <SettingOption value="en">{t('common.language.en')}</SettingOption>
            <SettingOption value="es">{t('common.language.es')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.interface.fontWeight')} description={t('settings.interface.fontWeightDesc')}>
          <div className="flex flex-col items-end gap-1.5">
            {seg(t('settings.interface.fontWeight'), fontWeight, [
              ['normal', t('settings.options.weights.normal')],
              ['light', t('settings.options.weights.light')],
              ['lighter', t('settings.options.weights.lighter')],
            ], (v) => updateSetting('interface.fontWeight', v))}
            {/* Shows the ramp itself rather than one sample: the setting flattens the
                distance between body copy and headings, which a single word cannot show.
                It previews live because the attribute is already on <html>. */}
            <span aria-hidden="true" className="flex items-baseline gap-2 text-zinc-300">
              <span className="text-[15px] font-normal">{t('settings.interface.fontWeightSample')}</span>
              <span className="text-[15px] font-semibold">{t('settings.interface.fontWeightSample')}</span>
              <span className="text-[15px] font-bold">{t('settings.interface.fontWeightSample')}</span>
            </span>
          </div>
        </SettingRow>
        <SettingRow label={t('settings.interface.lockLayout')} description={t('settings.interface.lockLayoutDesc')}>
          <Toggle id="toggle-lock-layout" label={t('settings.interface.lockLayout')} checked={ui.lockLayout ?? false} onChange={(v: boolean) => updateSetting('interface.lockLayout', v)} />
        </SettingRow>
        <SettingRow label={t('settings.interface.toastPosition')} description={toastLabel}>
          <div
            role="radiogroup"
            aria-label={t('settings.interface.toastPosition')}
            className="grid grid-cols-3 gap-1 w-[150px] h-[72px] p-1 rounded-[10px] border border-zinc-700 bg-zinc-950"
          >
            {TOAST_POSITIONS.map((p) => {
              const on = toastPosition === p.value;
              const label = tk(`settings.options.positions.${p.labelKey}`);
              return (
                <Tip key={p.value} content={label}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={label}
                    onClick={() => handleToastPositionChange({ target: { value: p.value } })}
                    className={cn('flex p-1 rounded-md', p.v, p.h, on ? 'bg-zinc-800' : 'hover:bg-zinc-900')}
                  >
                    <span className={cn('block w-[18px] h-2 rounded-[3px]', on ? 'bg-primary' : 'bg-zinc-700')} />
                  </button>
                </Tip>
              );
            })}
          </div>
        </SettingRow>
      </Section>

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
                <input
                  type="color"
                  value={singerColors[i] || '#888888'}
                  onChange={(e) => {
                    const next = [...(singerColors.length ? singerColors : Array(8).fill(''))];
                    next[i] = e.target.value;
                    updateSetting('editor.display.singerColors', next);
                  }}
                  className="size-8 p-0 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
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
        <SettingRow label={t('settings.interface.dualLine')} description={t('settings.interface.dualLineDesc')}>
          <Toggle id="toggle-dual-line" label={t('settings.interface.dualLine')} checked={dualLine} onChange={(v: boolean) => updateSetting('editor.display.dualLine', v)} />
        </SettingRow>
        {dualLine && (
          <SettingRow nested label={t('settings.interface.showNextLine')} description={t('settings.interface.showNextLineDesc')}>
            <Toggle id="toggle-show-next-line" label={t('settings.interface.showNextLine')} checked={display.showNextLine ?? true} onChange={(v: boolean) => updateSetting('editor.display.showNextLine', v)} />
          </SettingRow>
        )}
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
