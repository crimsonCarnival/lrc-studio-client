import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle } from '../shared';
import { useExportSettings } from '../../hooks/useExportSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Download, WrapText, Clipboard, FileDown, Clock, FileText, FilterX, ArrowUpDown, Tag, Settings2, FolderOutput } from 'lucide-react';

export default function ExportSettings({ settings, updateSetting, searchTerm }) {
  const { t } = useTranslation();
  const {
    handleLineEndingsChange,
    handleCopyFormatChange,
    handleDownloadFormatChange,
    handleWordTimestampPrecisionChange,
    handleFilenamePatternChange,
  } = useExportSettings(updateSetting);

  return (
    <>
      <Section title={t('settings.export.formatSection') || 'Format & Encoding'} icon={Download} searchTerm={searchTerm}>
        <SettingRow icon={WrapText} label={t('settings.export.lineEndings')} description={t('settings.export.lineEndingsDesc')}>
          <Select
            value={settings.export?.lineEndings ?? 'lf'}
            onValueChange={(val) => handleLineEndingsChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="lf">{t('settings.options.lineEndings.lf')}</SelectItem>
              <SelectItem value="crlf">{t('settings.options.lineEndings.crlf')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={Clipboard} label={t('settings.export.copyFormat')} description={t('settings.export.copyFormatDesc')}>
          <Select
            value={settings.export?.copyFormat ?? 'lrc'}
            onValueChange={(val) => handleCopyFormatChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="lrc">{t('settings.options.formats.lrc')}</SelectItem>
              <SelectItem value="srt">{t('settings.options.formats.srt')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={FileDown} label={t('settings.export.downloadFormat')} description={t('settings.export.downloadFormatDesc')}>
          <Select
            value={settings.export?.downloadFormat ?? 'lrc'}
            onValueChange={(val) => handleDownloadFormatChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="lrc">{t('settings.options.formats.lrc')}</SelectItem>
              <SelectItem value="srt">{t('settings.options.formats.srt')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </Section>

      <Section title={t('settings.export.processingSection') || 'Timestamps & Processing'} icon={Settings2} searchTerm={searchTerm}>
        <SettingRow icon={Clock} label={t('settings.export.timestampPrecision')} description={t('settings.export.timestampPrecisionDesc')}>
          <span className="text-xs text-zinc-500 italic">{t('settings.export.timestampPrecisionFollowsEditor') || 'Follows the Editor setting'}</span>
        </SettingRow>
        <SettingRow icon={Clock} label={t('settings.export.wordTimestampPrecision')} description={t('settings.export.wordTimestampPrecisionDesc')}>
          <Select
            value={settings.export?.wordTimestampPrecision ?? 'hundredths'}
            onValueChange={(val) => handleWordTimestampPrecisionChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="hundredths">{t('settings.options.precision.hundredths')}</SelectItem>
              <SelectItem value="thousandths">{t('settings.options.precision.thousandths')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={ArrowUpDown} label={t('settings.export.normalizeTimestamps')} description={t('settings.export.normalizeTimestampsDesc')}>
          <Toggle
            id="toggle-normalize-ts"
            checked={settings.export?.normalizeTimestamps ?? false}
            onChange={(v) => updateSetting('export.normalizeTimestamps', v)}
          />
        </SettingRow>
      </Section>

      <Section title={t('settings.export.outputSection') || 'Output Options'} icon={FolderOutput} searchTerm={searchTerm}>
        <SettingRow icon={FileText} label={t('settings.export.filenamePattern')} description={t('settings.export.filenamePatternDesc')}>
          <Select
            value={settings.export?.defaultFilenamePattern ?? 'fixed'}
            onValueChange={(val) => handleFilenamePatternChange({ target: { value: val } })}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="fixed">{t('settings.export.filenameFixed')}</SelectItem>
              <SelectItem value="media">{t('settings.export.filenameMedia')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={FilterX} label={t('settings.export.stripEmptyLines')} description={t('settings.export.stripEmptyLinesDesc')}>
          <Toggle
            id="toggle-strip-empty"
            checked={settings.export?.stripEmptyLines ?? false}
            onChange={(v) => updateSetting('export.stripEmptyLines', v)}
          />
        </SettingRow>
        <SettingRow icon={Tag} label={t('settings.export.includeMetadata')} description={t('settings.export.includeMetadataDesc')}>
          <Toggle
            id="toggle-include-metadata"
            checked={settings.export?.includeMetadata ?? true}
            onChange={(v) => updateSetting('export.includeMetadata', v)}
          />
        </SettingRow>
      </Section>
    </>
  );
}
