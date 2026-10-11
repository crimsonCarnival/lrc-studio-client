import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { Section, SettingRow, Toggle, SegmentedControl, SettingSelect, SettingOption } from '../shared';
import { useExportSettings } from '../../hooks/useExportSettings';
import { cn } from '@/shared/utils/utils';

interface ExportSettingsProps {
  settings: {
    editor?: { timestampPrecision?: string };
    export?: {
      lineEndings?: string;
      copyFormat?: string;
      downloadFormat?: string;
      wordTimestampPrecision?: string;
      normalizeTimestamps?: boolean;
      defaultFilenamePattern?: string;
      stripEmptyLines?: boolean;
      includeMetadata?: boolean;
    };
  };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
}

interface PreviewLine { text: string; kind: 'meta' | 'time' | 'blank' }

/** Sample file shaped by the current export settings; purely illustrative. */
function buildPreview(format: string, includeMetadata: boolean, stripEmpty: boolean, sample: string[]): PreviewLine[] {
  const lines: PreviewLine[] = [];
  if (format === 'srt') {
    lines.push({ text: '1', kind: 'meta' }, { text: `00:00:12,400 --> 00:00:16,850`, kind: 'time' }, { text: sample[0], kind: 'time' }, { text: '', kind: 'blank' });
    lines.push({ text: '2', kind: 'meta' }, { text: `00:00:16,850 --> 00:00:21,320`, kind: 'time' }, { text: sample[1], kind: 'time' });
    return lines;
  }
  if (includeMetadata) {
    lines.push({ text: '[ar:$uicideboy$]', kind: 'meta' }, { text: "[ti:MFIN' FLODGERS]", kind: 'meta' }, { text: '[length:02:32]', kind: 'meta' });
  }
  lines.push({ text: `[00:12.40] ${sample[0]}`, kind: 'time' }, { text: `[00:16.85] ${sample[1]}`, kind: 'time' });
  if (!stripEmpty) lines.push({ text: '[00:20.10]', kind: 'blank' });
  lines.push({ text: `[00:21.32] ${sample[2]}`, kind: 'time' });
  return lines;
}

export default function ExportSettings({ settings, updateSetting, searchTerm }: ExportSettingsProps) {
  const { t } = useTranslation();
  const tk = t as (key: string, opts?: Record<string, unknown>) => string;
  const {
    handleLineEndingsChange,
    handleCopyFormatChange,
    handleDownloadFormatChange,
    handleWordTimestampPrecisionChange,
    handleFilenamePatternChange,
  } = useExportSettings(updateSetting);
  const exp = settings.export;
  const eol = exp?.lineEndings === 'crlf' ? 'crlf' : 'lf';
  const downloadFormat = exp?.downloadFormat ?? 'lrc';
  const fileName = (exp?.defaultFilenamePattern ?? 'fixed') === 'fixed'
    ? `lyrics.${downloadFormat}`
    : `${t('settings.export.previewMediaName')}.${downloadFormat}`;
  const preview = buildPreview(
    downloadFormat,
    exp?.includeMetadata ?? true,
    exp?.stripEmptyLines ?? false,
    [1, 2, 3].map((n) => t('settings.export.previewLine', { n })),
  );
  const editorPrecision = tk(`settings.options.precision.${settings.editor?.timestampPrecision ?? 'hundredths'}`);

  const formatOptions = (
    <>
      <SettingOption value="lrc">{t('settings.options.formats.lrc')}</SettingOption>
      <SettingOption value="srt">{t('settings.options.formats.srt')}</SettingOption>
    </>
  );

  return (
    <>
      {!searchTerm && (
        <section className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-mono text-sm text-zinc-100">
              <Icon name="description" size={16} className="text-primary" />
              {fileName}
            </span>
            <span className="font-mono text-[13px] text-zinc-400">{eol.toUpperCase()} · UTF-8</span>
          </div>
          <pre
            aria-label={t('settings.export.previewLabel')}
            className="mt-3.5 overflow-x-auto whitespace-pre rounded-xl border border-zinc-800 bg-zinc-950 px-[18px] py-4 font-mono text-[13px] leading-[1.7] text-zinc-100"
          >
            {preview.map((l, i) => (
              <span key={i} className={cn('block', l.kind === 'meta' && 'text-teal-300', l.kind === 'blank' && 'text-zinc-500')}>{l.text || ' '}</span>
            ))}
          </pre>
          <p className="mt-2.5 text-[13px] text-zinc-400">{t('settings.export.previewNote')}</p>
        </section>
      )}

      <Section title={t('settings.export.formatSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.export.downloadFormat')} description={t('settings.export.downloadFormatDesc')}>
          <SettingSelect label={t('settings.export.downloadFormat')} value={downloadFormat} onValueChange={(val) => handleDownloadFormatChange({ target: { value: val } })}>
            {formatOptions}
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.export.copyFormat')} description={t('settings.export.copyFormatDesc')}>
          <SettingSelect label={t('settings.export.copyFormat')} value={exp?.copyFormat ?? 'lrc'} onValueChange={(val) => handleCopyFormatChange({ target: { value: val } })}>
            {formatOptions}
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.export.lineEndings')} description={t('settings.export.lineEndingsDesc')}>
          <SegmentedControl
            label={t('settings.export.lineEndings')}
            value={eol}
            options={[
              { value: 'lf', label: t('settings.options.lineEndings.lf') },
              { value: 'crlf', label: t('settings.options.lineEndings.crlf') },
            ]}
            onChange={(v) => handleLineEndingsChange({ target: { value: v } })}
          />
        </SettingRow>
      </Section>

      <Section title={t('settings.export.processingSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.export.timestampPrecision')} description={t('settings.export.followsEditorDesc', { precision: editorPrecision })}>
          <Link to="/settings/editor" className="text-sm font-semibold text-primary hover:underline">{t('settings.export.changeInEditor')}</Link>
        </SettingRow>
        <SettingRow label={t('settings.export.wordTimestampPrecision')} description={t('settings.export.wordTimestampPrecisionDesc')}>
          <SettingSelect
            label={t('settings.export.wordTimestampPrecision')}
            value={exp?.wordTimestampPrecision ?? 'hundredths'}
            onValueChange={(val) => handleWordTimestampPrecisionChange({ target: { value: val } })}
          >
            <SettingOption value="hundredths">{t('settings.options.precision.hundredths')}</SettingOption>
            <SettingOption value="thousandths">{t('settings.options.precision.thousandths')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.export.normalizeTimestamps')} description={t('settings.export.normalizeTimestampsDesc')}>
          <Toggle id="toggle-normalize-ts" label={t('settings.export.normalizeTimestamps')} checked={exp?.normalizeTimestamps ?? false} onChange={(v) => updateSetting('export.normalizeTimestamps', v)} />
        </SettingRow>
      </Section>

      <Section title={t('settings.export.outputSection')} searchTerm={searchTerm}>
        <SettingRow label={t('settings.export.filenamePattern')} description={t('settings.export.filenamePatternDesc')}>
          <SettingSelect
            label={t('settings.export.filenamePattern')}
            value={exp?.defaultFilenamePattern ?? 'fixed'}
            onValueChange={(val) => handleFilenamePatternChange({ target: { value: val } })}
          >
            <SettingOption value="fixed">{t('settings.export.filenameFixed')}</SettingOption>
            <SettingOption value="media">{t('settings.export.filenameMedia')}</SettingOption>
          </SettingSelect>
        </SettingRow>
        <SettingRow label={t('settings.export.includeMetadata')} description={t('settings.export.includeMetadataDesc')}>
          <Toggle id="toggle-include-metadata" label={t('settings.export.includeMetadata')} checked={exp?.includeMetadata ?? true} onChange={(v) => updateSetting('export.includeMetadata', v)} />
        </SettingRow>
        <SettingRow label={t('settings.export.stripEmptyLines')} description={t('settings.export.stripEmptyLinesDesc')}>
          <Toggle id="toggle-strip-empty" label={t('settings.export.stripEmptyLines')} checked={exp?.stripEmptyLines ?? false} onChange={(v) => updateSetting('export.stripEmptyLines', v)} />
        </SettingRow>
      </Section>
    </>
  );
}
