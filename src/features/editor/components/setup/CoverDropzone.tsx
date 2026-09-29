import { useCallback, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Icon } from '@/shared/ui/Icon';
import { LogoLoader } from '@ui/LogoLoader';
import { Tip } from '@ui/tip';

/**
 * Cap for the cover image. This mirrors the limit the previous inline handler
 * already enforced, so it is not a new restriction — but it used to reject
 * silently, which is the actual bug being fixed here.
 */
const MAX_COVER_MB = 5;
const MAX_COVER_BYTES = MAX_COVER_MB * 1024 * 1024;

type CoverDropzoneProps = {
  value: string;
  onChange: (url: string) => void;
  /** Uploads the file and resolves with its URL. Supplied by the caller so each surface keeps its own reCAPTCHA wiring. */
  onUpload: (file: File) => Promise<string>;
  /** Toggles the caller's URL field. Rendered as a link button under the tile so the URL path stays next to the cover it sets. */
  onToggleUrl?: () => void;
  urlOpen?: boolean;
  className?: string;
};

/**
 * Square cover slot: drop a file on it, click to browse, or clear it.
 *
 * Replaces a bare text input whose only affordance was pasting a URL. The URL
 * path is kept as a secondary input because existing projects store remote
 * cover URLs and some users paste them deliberately.
 */
export function CoverDropzone({ value, onChange, onUpload, onToggleUrl, urlOpen, className }: CoverDropzoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const accept = useCallback(async (file: File | undefined) => {
    if (!file) return;
    // Both of these used to `return` with no feedback at all, so an oversized
    // or non-image file looked exactly like a broken button.
    if (!file.type.startsWith('image/')) {
      toast.error(t('setup.coverInvalidType'));
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      toast.error(t('setup.coverTooLarge', { max: MAX_COVER_MB }));
      return;
    }
    setUploading(true);
    try {
      onChange(await onUpload(file));
    } catch {
      toast.error(t('setup.coverUploadFailed'));
    } finally {
      setUploading(false);
    }
  }, [onChange, onUpload, t]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void accept(e.dataTransfer.files?.[0]);
  };

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="relative size-[72px] shrink-0"
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label={value ? t('setup.coverReplace') : t('setup.coverDropHint')}
          className={`size-full rounded-xl border border-dashed overflow-hidden flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
            dragging
              ? 'border-primary bg-primary/10'
              : 'border-zinc-700/60 bg-zinc-900/40 hover:border-primary/50'
          }`}
        >
          {uploading ? (
            <LogoLoader size={18} />
          ) : value ? (
            <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <>
              <Icon name="add_photo_alternate" size={18} className="text-zinc-500" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                {t('setup.coverDropTitle')}
              </span>
            </>
          )}
        </button>

        {value && !uploading && (
          <Tip content={t('setup.coverRemove')}>
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label={t('setup.coverRemove')}
              className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-destructive hover:border-destructive/60 flex items-center justify-center transition-colors"
            >
              <Icon name="close" size={12} />
            </button>
          </Tip>
        )}
      </div>

      {onToggleUrl && (
        <Tip content={t('setup.coverUrlLabel')}>
          <button
            type="button"
            onClick={onToggleUrl}
            aria-expanded={!!urlOpen}
            aria-label={t('setup.coverUrlLabel')}
            className={`mt-1 w-[72px] h-6 rounded-lg border flex items-center justify-center gap-1 transition-colors ${
              urlOpen
                ? 'border-primary/50 text-primary bg-primary/10'
                : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <Icon name="link" size={12} />
            <span className="text-[9px] font-bold uppercase tracking-wider">URL</span>
          </button>
        </Tip>
      )}

      <input
        type="file"
        ref={inputRef}
        accept="image/*"
        onChange={(e) => { void accept(e.target.files?.[0]); e.target.value = ''; }}
        className="hidden"
      />
    </div>
  );
}
