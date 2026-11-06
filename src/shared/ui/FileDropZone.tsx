import { useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

type FileDropZoneProps = {
  /** Receives the first dropped file. Validation (type, size, feedback) stays with the caller. */
  onFile: (file: File) => void;
  disabled?: boolean;
  /** Icon-only hint, for tiles too small to hold the label. */
  compact?: boolean;
  /**
   * For zones on pages that also accept page-wide drops (the editor): only drops landing
   * on the zone are claimed, and the page-wide overlay and import keep working elsewhere.
   */
  localOnly?: boolean;
  className?: string;
  children: ReactNode;
};

const hasFiles = (e: DragEvent) => e.dataTransfer?.types?.includes('Files') ?? false;

/**
 * Wraps a file field so files can be dropped on it, with the drop hint drawn over
 * the field itself instead of over the whole page.
 *
 * `data-file-drop` is what tells the window-level handler in `useDragAndDrop` to stand
 * down for drops on the zone (otherwise it would run a second import alongside this
 * one), and, for page-owning zones, to drop its full-page overlay entirely.
 */
export function FileDropZone({ onFile, disabled, compact, localOnly, className = '', children }: FileDropZoneProps) {
  const { t } = useTranslation();
  const [over, setOver] = useState(false);
  // dragenter/dragleave also fire for every child element, so a boolean flickers;
  // a depth counter only reaches 0 when the pointer really leaves the zone.
  const depth = useRef(0);

  const active = over && !disabled;

  return (
    <div
      data-file-drop={localOnly ? 'local' : 'page'}
      className={`relative ${className}`}
      onDragEnter={(e) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => {
        if (disabled || !hasFiles(e)) return;
        // Without this the browser rejects the drop.
        e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (disabled || !hasFiles(e)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      {children}
      {active && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 rounded-[inherit] border-2 border-dashed border-primary bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-1 pointer-events-none text-primary"
        >
          <Icon name="cloud_upload" size={compact ? 20 : 28} />
          {!compact && <span className="text-xs font-semibold text-center px-2">{t('common.dropFileHere')}</span>}
        </div>
      )}
    </div>
  );
}
