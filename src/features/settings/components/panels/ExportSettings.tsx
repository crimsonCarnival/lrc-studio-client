import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle } from '../shared';
import { useExportSettings } from '../../hooks/useExportSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Icon } from '@/shared/ui/Icon';

const DownloadIcon = ({ className }: { className?: string }) => <Icon name="download" className={className} />;
const WrapTextIcon = ({ className }: { className?: string }) => <Icon name="wrap_text" className={className} />;
const ClipboardIcon = ({ className }: { className?: string }) => <Icon name="content_paste" className={className} />;
const FileDownIcon = ({ className }: { className?: string }) => <Icon name="file_download" className={className} />;
const ClockIcon = ({ className }: { className?: string }) => <Icon name="schedule" className={className} />;
const FileTextIcon = ({ className }: { className?: string }) => <Icon name="description" className={className} />;
const FilterXIcon = ({ className }: { className?: string }) => <Icon name="filter_list_off" className={className} />;
const ArrowUpDownIcon = ({ className }: { className?: string }) => <Icon name="swap_vert" className={className} />;
const TagIcon = ({ className }: { className?: string }) => <Icon name="label" className={className} />;
const Settings2Icon = ({ className }: { className?: string }) => <Icon name="tune" className={className} />;
const FolderOutputIcon = ({ className }: { className?: string }) => <Icon name="folder_zip" className={className} />;

interface ExportSettingsProps {
  settings: {
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

export default function ExportSettings({ settings, updateSetting, searchTerm }: ExportSettingsProps) {
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
      <Section title={t('settings.export.formatSection') || 'Format & Encoding'} icon={DownloadIcon} searchTerm={searchTerm}>
        <SettingRow icon={WrapTextIcon} label={t('settings.export.lineEndings')} description={t('settings.export.lineEndingsDesc')}>
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
        <SettingRow icon={ClipboardIcon} label={t('settings.export.copyFormat')} description={t('settings.export.copyFormatDesc')}>
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
        <SettingRow icon={FileDownIcon} label={t('settings.export.downloadFormat')} description={t('settings.export.downloadFormatDesc')}>
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

      <Section title={t('settings.export.processingSection') || 'Timestamps & Processing'} icon={Settings2Icon} searchTerm={searchTerm}>
        <SettingRow icon={ClockIcon} label={t('settings.export.timestampPrecision')} description={t('settings.export.timestampPrecisionDesc')}>
          <span className="text-xs text-zinc-500 italic">{t('settings.export.timestampPrecisionFollowsEditor')}</span>
        </SettingRow>
        <SettingRow icon={ClockIcon} label={t('settings.export.wordTimestampPrecision')} description={t('settings.export.wordTimestampPrecisionDesc')}>
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
        <SettingRow icon={ArrowUpDownIcon} label={t('settings.export.normalizeTimestamps')} description={t('settings.export.normalizeTimestampsDesc')}>
          <Toggle
            id="toggle-normalize-ts"
            checked={settings.export?.normalizeTimestamps ?? false}
            onChange={(v) => updateSetting('export.normalizeTimestamps', v)}
          />
        </SettingRow>
      </Section>

      <Section title={t('settings.export.outputSection') || 'Output Options'} icon={FolderOutputIcon} searchTerm={searchTerm}>
        <SettingRow icon={FileTextIcon} label={t('settings.export.filenamePattern')} description={t('settings.export.filenamePatternDesc')}>
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
        <SettingRow icon={FilterXIcon} label={t('settings.export.stripEmptyLines')} description={t('settings.export.stripEmptyLinesDesc')}>
          <Toggle
            id="toggle-strip-empty"
            checked={settings.export?.stripEmptyLines ?? false}
            onChange={(v) => updateSetting('export.stripEmptyLines', v)}
          />
        </SettingRow>
        <SettingRow icon={TagIcon} label={t('settings.export.includeMetadata')} description={t('settings.export.includeMetadataDesc')}>
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
