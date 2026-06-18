import useInputMethod from '@/shared/hooks/useInputMethod';
import Editor from './core/Editor';
import MobileEditorLayout from './mobile/MobileEditorLayout';
import type { EditorLine } from '../services/editor.service';

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
 * EditorPage wrapper that conditionally renders mobile or desktop layout based on input method
 */
export default function EditorPage(props: EditorPageProps) {
  const inputMethod = useInputMethod();

  // Mobile layout when touch input (touch-only device)
  const isMobileLayout = inputMethod === 'touch';

  // Editor and MobileEditorLayout are still untyped JS; cast the passthrough props.
  // Editor and MobileEditorLayout are still untyped JS; cast the passthrough props.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Mobile = MobileEditorLayout as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Full = Editor as any;

  // For mobile, use simplified layout; for desktop/hybrid, use full editor
  if (isMobileLayout) {
    return (
      <Mobile
        activeLineIndex={props.activeLineIndex}
        setActiveLineIndex={props.setActiveLineIndex}
        lines={props.lines}
        setLines={props.setLines}
        playbackPosition={props.playbackPosition}
        playerRef={props.playerRef}
        undo={props.undo}
        canUndo={props.canUndo}
        syncMode={props.syncMode}
        setSyncMode={props.setSyncMode}
        editorMode={props.editorMode}
        setEditorMode={props.setEditorMode}
        duration={props.duration}
        isPlaying={props.isPlaying}
      />
    );
  }

  // Desktop layout - render full editor
  return <Full {...props} />;
}
