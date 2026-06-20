import { useState, useCallback } from 'react';
import type { EditorLine, EditorWord } from '@/features/editor/services/editor.service';

export type DrawerKind = 'word' | 'bulk' | 'line' | null;

export interface WordMenuData {
  lineIndex: number | null;
  wordIndex: number | null;
  word: EditorWord | null;
  isSecondary: boolean;
}

export interface LineMenuData {
  lineIndex: number | null;
  line: EditorLine | null;
}

/**
 * Owns the mobile action-drawer state. The open* callbacks are handed to the
 * line list (which triggers them), while the drawer component reads the state —
 * so the state must live here, above both.
 */
export function useEditorActionDrawer() {
  const [activeDrawer, setActiveDrawer] = useState<DrawerKind>(null);
  const [wordData, setWordData] = useState<WordMenuData>({ lineIndex: null, wordIndex: null, word: null, isSecondary: false });
  const [lineData, setLineData] = useState<LineMenuData>({ lineIndex: null, line: null });

  const openWord = useCallback((lineIndex: number, wordIndex: number, word: EditorWord, isSecondary: boolean) => {
    setWordData({ lineIndex, wordIndex, word, isSecondary });
    setActiveDrawer('word');
  }, []);

  const openLine = useCallback((lineIndex: number, line: EditorLine) => {
    setLineData({ lineIndex, line });
    setActiveDrawer('line');
  }, []);

  const openBulk = useCallback(() => setActiveDrawer('bulk'), []);
  const close = useCallback(() => setActiveDrawer(null), []);

  return { activeDrawer, wordData, lineData, openWord, openLine, openBulk, close };
}
