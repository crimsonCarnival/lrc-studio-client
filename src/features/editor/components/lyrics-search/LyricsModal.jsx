import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@ui/dialog';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import { Loader2 } from 'lucide-react';

export default function LyricsModal({ song, lyrics, isLoading, error, onConfirm, onClose, keepTimestamps, onKeepTimestampsChange, showKeepTimestamps = true }) {
  const { t } = useTranslation();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {t('lyricsSearch.preview')}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 mt-0.5">
            {song ? `${song.title} — ${song.artist}` : t('lyricsSearch.previewDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 my-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-zinc-400">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">{t('lyricsSearch.extracting')}</span>
            </div>
          )}

          {error && !isLoading && (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          )}

          {lyrics && !isLoading && (
            <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
              {lyrics}
            </pre>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
          {showKeepTimestamps ? (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={keepTimestamps}
                onCheckedChange={onKeepTimestampsChange}
                className="size-3.5 border-zinc-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-xs text-zinc-400">{t('lyricsSearch.keepTimestamps')}</span>
            </label>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => onConfirm(lyrics)}
              disabled={!lyrics || isLoading}
            >
              {t('lyricsSearch.useLyrics')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
