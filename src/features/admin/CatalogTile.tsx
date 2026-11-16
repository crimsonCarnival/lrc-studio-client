import type { ReactNode } from 'react';
import { avatarHue } from '@/shared/ui/avatar-hue';
import { isCloudinaryUrl } from './catalog-image';

type CatalogTileProps = {
  url: string | null | undefined;
  /** Names the entry: gives the fallback its letter and colour. */
  name: string;
  alt: string;
  /** Sizing and shape, e.g. `aspect-square rounded-xl`. */
  className?: string;
  initialClassName?: string;
  /** Overlays, such as a source chip. */
  children?: ReactNode;
};

/** An entry's image, or its first letter on a colour of its own when it has none (or the URL is not ours to fetch). */
export function CatalogTile({ url, name, alt, className = '', initialClassName = 'text-5xl', children }: CatalogTileProps) {
  const ok = isCloudinaryUrl(url);
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-muted ${className}`} style={ok ? undefined : avatarHue(name)}>
      {ok
        ? <img src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
        : <span aria-hidden="true" className={`font-heading font-semibold ${initialClassName}`}>{Array.from(name)[0]?.toUpperCase()}</span>}
      {children}
    </div>
  );
}
