import useInputMethod from '@/shared/hooks/useInputMethod';
import Editor from './core/Editor';
import MobileEditorLayout from './mobile/MobileEditorLayout';

/**
 * EditorPage wrapper that conditionally renders mobile or desktop layout based on input method
 */
export default function EditorPage(props) {
  const inputMethod = useInputMethod();

  // Mobile layout when touch input (touch-only device)
  const isMobileLayout = inputMethod === 'touch';

  // For mobile, use simplified layout; for desktop/hybrid, use full editor
  if (isMobileLayout) {
    return (
      <MobileEditorLayout
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
  return <Editor {...props} />;
}
