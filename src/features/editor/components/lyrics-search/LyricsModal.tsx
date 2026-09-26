import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@ui/dialog';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import { Icon } from '@/shared/ui/Icon';
import type { LyricsProvider } from '@features/editor/services/lyrics-search.service';

interface LyricsModalProps {
  song?: { title: string; artist: string } | null;
  lyrics?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onConfirm: (lyrics: string | null | undefined) => void;
  onClose: () => void;
  keepTimestamps?: boolean;
  onKeepTimestampsChange?: (checked: boolean | 'indeterminate') => void;
  showKeepTimestamps?: boolean;
  /** True when `lyrics` is LRC rather than plain text. */
  synced?: boolean;
  /** Which provider answered — shown as attribution. */
  provider?: LyricsProvider;
}

const PROVIDER_LABEL: Record<LyricsProvider, string> = {
  lrclib: 'LRCLIB',
  lyricfind: 'LyricFind',
  lyricsovh: 'lyrics.ovh',
};

export default function LyricsModal({ song, lyrics, isLoading, error, onConfirm, onClose, keepTimestamps, onKeepTimestampsChange, showKeepTimestamps = true, synced, provider }: LyricsModalProps) {
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

        {synced && !isLoading && !error && (
          <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/25">
            <Icon name="schedule" size={16} className="text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary">{t('lyricsSearch.syncedTitle')}</p>
              <p className="text-[11px] text-zinc-400 leading-snug">{t('lyricsSearch.syncedDesc')}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 my-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-zinc-400">
              <Icon name="autorenew" size={16} className="animate-spin" />
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

        {provider && lyrics && !isLoading && (
          <p className="text-[10px] text-zinc-500 pb-2">
            {t('lyricsSearch.providedBy', { provider: PROVIDER_LABEL[provider] ?? provider })}
          </p>
        )}

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
