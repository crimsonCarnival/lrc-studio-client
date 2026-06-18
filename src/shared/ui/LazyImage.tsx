import type { ImgHTMLAttributes } from 'react';

type LazyImageProps = ImgHTMLAttributes<HTMLImageElement>;

export function LazyImage({ src, alt, width, height, className, referrerPolicy = 'no-referrer', ...props }: LazyImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      // Strip the Referer header by default: third-party avatar CDNs such as
      // Google (lh3.googleusercontent.com) reject cross-origin requests that
      // carry a referrer with a 403, which breaks the image silently.
      referrerPolicy={referrerPolicy}
      className={className}
      {...props}
    />
  );
}
