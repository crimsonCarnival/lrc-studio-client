import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveModal } from '@/shared/ui/ResponsiveModal';
import { usePlayer } from '../PlayerContext';
import type { UploadItem } from '../PlayerContext';
import { ChangeMediaPopoverContent } from './PlayerControls';

/**
 * The change-media choices (file, link, past uploads, remove) in a dialog, for callers
 * that have no room for the player's own popover, such as the editor's "..." menu.
 */
export function ChangeMediaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const { mediaPopoverProps, fetchUploads } = usePlayer();
  const close = () => onOpenChange(false);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next: boolean) => {
        if (next) fetchUploads();
        onOpenChange(next);
      }}
      title={t('player.changeSong')}
    >
      <ChangeMediaPopoverContent
        fileInputId="change-media-file-dialog"
        {...mediaPopoverProps}
        onFileChange={(e: ChangeEvent<HTMLInputElement>) => { mediaPopoverProps.onFileChange(e); close(); }}
        onUrlLoad={() => { mediaPopoverProps.onUrlLoad(); close(); }}
        onSelectUpload={(upload: UploadItem) => { mediaPopoverProps.onSelectUpload(upload); close(); }}
        onClearMedia={() => { mediaPopoverProps.onClearMedia(); close(); }}
      />
    </ResponsiveModal>
  );
}
