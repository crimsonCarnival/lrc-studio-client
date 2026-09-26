import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { lyrics } from '@/app/api';
import { useTranslation } from 'react-i18next';
import type { AppSettings } from '@/features/settings/settings.types';
import type { EditorLine } from '@/features/editor/services/editor.service';

interface FileImportOptions {
  setLines: (lines: EditorLine[]) => void;
  setEditorMode: (mode: string) => void;
  setActiveLineIndex: (index: number) => void;
  setSyncMode: (sync: boolean) => void;
  onImport?: () => void;
  settings: AppSettings;
}

export function useFileImport({ setLines, setEditorMode, setActiveLineIndex, setSyncMode, onImport, settings }: FileImportOptions) {
  const { t } = useTranslation();
  // import.success is a plural/interpolated key not in the typed resource map.
  const tk = t as (key: string, options?: Record<string, unknown>) => string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseOptions = { preserveEmptyLines: settings?.editor?.preserveEmptyLines ?? false };

  /**
   * Parse lyrics text and load it into the editor. `filename` only carries the
   * extension, which is what the server parser uses to pick LRC vs SRT vs TXT.
   * Returns the parsed line count, or 0 when the text yielded nothing.
   *
   * Shared by every import path (file, URL, lyrics search) so they all agree on
   * editor mode detection, cursor placement and the post-import save trigger.
   */
  const applyImportedText = async (text: string, filename: string): Promise<number> => {
    const { lines: parsed } = await lyrics.parse(text, filename, parseOptions) as { lines: EditorLine[] };
    if (parsed.length === 0) return 0;

    setLines(parsed);
    const isSrt = filename.toLowerCase().endsWith('.srt');
    const hasWords = !isSrt && parsed.some(l => (l.words?.length ?? 0) > 0);
    setEditorMode(isSrt ? 'srt' : hasWords ? 'words' : 'lrc');
    // Park the cursor on the first unsynced line so syncing can start immediately.
    setActiveLineIndex(Math.max(0, parsed.findIndex((l) => l.timestamp == null)));
    setSyncMode(true);
    onImport?.();
    return parsed.length;
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['lrc', 'srt', 'txt'].includes(ext)) {
      toast.error(t('import.unsupportedFormat'));
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('import.tooLarge'));
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const count = await applyImportedText(evt.target?.result as string, file.name);
        if (count > 0) {
          toast.success(tk('import.success', { count }));
        } else {
          toast.error(t('import.noLines'));
        }
      } catch (err) {
        console.error('Failed to parse lyrics file', err);
        toast.error(t('import.failed'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUrlImport = async (url: string): Promise<{ error?: string; success?: boolean }> => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      return { error: t('import.invalidUrl') };
    }
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      const filename = parsedUrl.pathname.split('/').pop() || 'lyrics.lrc';
      const count = await applyImportedText(text, filename);
      if (count === 0) {
        return { error: t('import.noLines') };
      }
      toast.success(tk('import.success', { count }));
      return { success: true };
    } catch {
      return { error: t('import.fetchError') };
    }
  };

  /**
   * Import lyrics text that is already in hand (the lyrics search). Treated as
   * LRC so timestamps survive when the provider returned synced lyrics; plain
   * text parses fine under the same parser.
   */
  const handleTextImport = async (text: string): Promise<boolean> => {
    try {
      const count = await applyImportedText(text, 'lyrics.lrc');
      if (count === 0) {
        toast.error(t('import.noLines'));
        return false;
      }
      toast.success(tk('import.success', { count }));
      return true;
    } catch (err) {
      console.error('Failed to parse imported lyrics', err);
      toast.error(t('import.failed'));
      return false;
    }
  };

  return { handleFileUpload, handleUrlImport, handleTextImport, fileInputRef };
}
