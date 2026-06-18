import { useTranslation } from 'react-i18next';

type UpdateSetting = (path: string, value: unknown) => void;
type ChangeLike = { target: { value: string } };

export function useInterfaceSettings(updateSetting: UpdateSetting) {
  const { i18n } = useTranslation();

  const handleLanguageChange = (e: ChangeLike) => {
    const lang = e.target.value;
    updateSetting('interface.defaultLanguage', lang);
    i18n.changeLanguage(lang);
  };

  const handleThemeChange = (e: ChangeLike) => updateSetting('interface.theme', e.target.value);

  const handleActiveHighlightChange = (e: ChangeLike) =>
    updateSetting('editor.display.activeHighlight', e.target.value);

  const handleScrollModeChange = (e: ChangeLike) => updateSetting('editor.scroll.mode', e.target.value);

  const handleScrollAlignmentChange = (e: ChangeLike) =>
    updateSetting('editor.scroll.alignment', e.target.value);

  const handlePreviewAlignmentChange = (e: ChangeLike) =>
    updateSetting('interface.previewAlignment', e.target.value);

  const handleFontSizeChange = (e: ChangeLike) => updateSetting('interface.fontSize', e.target.value);

  const handleSpacingChange = (e: ChangeLike) => updateSetting('interface.spacing', e.target.value);

  const handleLanguageLayoutChange = (e: ChangeLike) =>
    updateSetting('editor.display.languageLayout', e.target.value);

  const handleTranslationLayoutChange = (e: ChangeLike) =>
    updateSetting('editor.display.translationLayout', e.target.value);

  const handleToastPositionChange = (e: ChangeLike) =>
    updateSetting('interface.toastPosition', e.target.value);

  return {
    handleLanguageChange,
    handleThemeChange,
    handleActiveHighlightChange,
    handleScrollModeChange,
    handleScrollAlignmentChange,
    handlePreviewAlignmentChange,
    handleFontSizeChange,
    handleSpacingChange,
    handleLanguageLayoutChange,
    handleTranslationLayoutChange,
    handleToastPositionChange,
  };
}
