import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import Editor from './core/Editor';
import type { EditorLine } from '@/features/editor/editor.types';

interface EditorPageProps {
  activeLineIndex?: number;
  setActiveLineIndex?: (i: number) => void;
  lines?: EditorLine[];
  setLines?: (lines: EditorLine[]) => void;
  playbackPosition?: number;
  playerRef?: unknown;
  undo?: () => void;
  canUndo?: boolean;
  syncMode?: boolean;
  setSyncMode?: (v: boolean) => void;
  editorMode?: string;
  setEditorMode?: (v: string) => void;
  duration?: number;
  isPlaying?: boolean;
  [key: string]: unknown;
}

/**
 * Picks the editor layout by width, not by input method: below `lg` the phone layout,
 * otherwise the desktop one. A touch tablet at `lg` or wider gets the desktop editor and a
 * narrow mouse window gets the phone one. Either way it is the same Editor, so both share
 * one useEditor and one set of behaviours.
 */
export default function EditorPage(props: EditorPageProps) {
  const isLg = useBreakpoint('lg');
  const phone = !isLg;

  // AppRouter passes a loose, untyped prop bag (its editorProps are cast to these props).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Full = Editor as any;
  return <Full {...props} phone={phone} />;
}
