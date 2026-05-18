import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { lyrics } from '@/app/api';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Handles drag-and-drop of audio and lyrics files onto the window.
 *
 * @param {object} opts
 * @param {Function} opts.setLines        — history-aware line setter
 * @param {Function} opts.setEditorMode   — raw editorMode setter
 * @param {number}   opts.linesLength     — current lines.length (for confirm guard)
 * @param {object}   opts.settings        — app settings
 * @param {Function} opts.requestConfirm  — confirm dialog trigger
 * @param {object}   opts.playerRef       — ref to the Player imperative handle
 */
export function useDragAndDrop({
  setLines,
  setEditorMode,
  linesLength,
  settings,
  requestConfirm,
  playerRef,
}) {
  const { t } = useTranslation();
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const maxDragDepth = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    maxDragDepth.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    maxDragDepth.current -= 1;
    if (maxDragDepth.current === 0) {
      setIsDraggingFile(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      maxDragDepth.current = 0;
      setIsDraggingFile(false);

      const file = e.dataTransfer?.files?.[0];
      if (!file) return;

      if (file.type.startsWith('audio/')) {
        if (playerRef.current?.loadLocalAudio) {
          playerRef.current.loadLocalAudio(file);
        }
        return;
      }

      const extension = file.name.split('.').pop().toLowerCase();

      if (['lrc', 'srt', 'txt'].includes(extension)) {
        if (file.size > MAX_IMPORT_FILE_SIZE) {
          toast.error(t('import.tooLarge') || 'File too large (max 5 MB)');
          return;
        }

        try {
          const text = await file.text();
          const { lines: parsedLines } = await lyrics.parse(text, file.name);

          if (parsedLines.length === 0) {
            toast.error(t('import.noLines') || 'No lyrics found in file');
            return;
          }

          const applyImport = () => {
            setLines(parsedLines);
            setEditorMode(extension === 'srt' ? 'srt' : 'lrc');
            toast.success(
              t('import.success', { count: parsedLines.length }) ||
                `Imported ${parsedLines.length} lines`,
            );
          };

          if (linesLength > 0 && settings.advanced.confirmDestructive) {
            requestConfirm(
              t('confirm.removeAll') || 'Replace existing lyrics?',
              applyImport,
              { title: t('confirm.replaceTitle') || 'Replace Lyrics', variant: 'danger' },
            );
          } else {
            applyImport();
          }
        } catch (err) {
          console.error('Failed to parse dropped lyrics file', err);
          toast.error(t('import.failed') || 'Failed to parse lyrics file');
        }
      } else {
        toast.error(
          t('import.unsupportedFormat') ||
            'Unsupported file type. Use .lrc, .srt, or .txt files.',
        );
      }
    },
    [linesLength, setLines, setEditorMode, settings.advanced.confirmDestructive, t, requestConfirm, playerRef],
  );

  const handleDragEnterRef = useRef(handleDragEnter);
  const handleDragLeaveRef = useRef(handleDragLeave);
  const handleDragOverRef = useRef(handleDragOver);
  const handleDropRef = useRef(handleDrop);

  useEffect(() => {
    handleDragEnterRef.current = handleDragEnter;
    handleDragLeaveRef.current = handleDragLeave;
    handleDragOverRef.current = handleDragOver;
    handleDropRef.current = handleDrop;
  });

  useEffect(() => {
    const onDragEnter = (e) => handleDragEnterRef.current(e);
    const onDragLeave = (e) => handleDragLeaveRef.current(e);
    const onDragOver = (e) => handleDragOverRef.current(e);
    const onDrop = (e) => handleDropRef.current(e);

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return { isDraggingFile };
}
