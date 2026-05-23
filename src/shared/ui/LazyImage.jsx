export function LazyImage({ src, alt, width, height, className, ...props }) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      {...props}
    />
  );
}

export default LazyImage;
