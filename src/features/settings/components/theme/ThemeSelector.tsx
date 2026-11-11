import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { CUSTOM_THEME_ID, customFromBase, parseCustomTheme } from '@/shared/theme/custom-theme';
import ThemeGrid from './ThemeGrid';
import ThemeEditor from './ThemeEditor';

type Props = {
  settings: { interface?: { theme?: string; customTheme?: string } };
  updateSetting: (path: string, value: unknown) => void;
  /** When given, only a few themes show and a link calls this to open the full list. */
  onBrowseAll?: () => void;
};

// Two rows of the four-column grid.
const PREVIEW_COUNT = 8;

/**
 * The one theme control: the swatch grid and the editor behind a button. The settings page and the
 * header's theme modal both render this, so picking and editing behave identically in both.
 */
export default function ThemeSelector({ settings, updateSetting, onBrowseAll }: Props) {
  const { t } = useTranslation();
  const ui = settings.interface ?? {};
  const current = ui.theme ?? 'dark';
  const custom = useMemo(() => parseCustomTheme(ui.customTheme), [ui.customTheme]);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ThemeEditor
        // A saved custom theme is edited in place; otherwise the editor starts from a copy of the theme in use.
        initial={current === CUSTOM_THEME_ID && custom ? custom : customFromBase(current === CUSTOM_THEME_ID ? 'dark' : current)}
        restore={{ theme: current, custom }}
        onCancel={() => setEditing(false)}
        onSave={(serialized) => {
          updateSetting('interface.customTheme', serialized);
          updateSetting('interface.theme', CUSTOM_THEME_ID);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ThemeGrid value={current} custom={custom} limit={onBrowseAll ? PREVIEW_COUNT : undefined} onChange={(id) => updateSetting('interface.theme', id)} />
      <div className="flex justify-end gap-2">
        {onBrowseAll && (
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onBrowseAll}>
            <Icon name="grid_view" size={14} />
            {t('settings.interface.allThemes')}
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
          <Icon name="palette" size={14} />
          {custom ? t('settings.themeEditor.edit') : t('settings.themeEditor.create')}
        </Button>
      </div>
    </div>
  );
}
