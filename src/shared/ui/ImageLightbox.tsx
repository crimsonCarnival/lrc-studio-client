import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

interface ImageLightboxProps {
  /** Lightbox is open iff this is non-null. */
  src: string | null;
  alt?: string;
  onClose: () => void;
}

/**
 * A plain full-screen image viewer — click the backdrop, press Escape, or hit the close
 * button to dismiss. Intentionally minimal (no zoom/pan/gallery): just a way to see a
 * profile avatar or cover at full size, ahead of fuller social interactions later.
 */
export function ImageLightbox({ src, alt = '', onClose }: ImageLightboxProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!src) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [src, onClose]);

  if (!src) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || t('common.close')}
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in p-6"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800 transition-colors"
      >
        <Icon name="close" size={22} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-[0_20px_60px_rgba(0,0,0,.6)]"
      />
    </div>,
    document.body,
  );
}
