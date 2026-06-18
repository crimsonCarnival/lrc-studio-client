/**
 * YouTube brand icon (official red play button shape).
 * Use className to control size (e.g. "size-4", "size-5").
 * For badge/indicator use cases, add a wrapper div for sizing and use fill={true}.
 */
interface YoutubeIconProps {
  className?: string;
  /** If true, renders the simplified flat icon (single path, no rounded rect). Default: false (official brand shape). */
  simple?: boolean;
}

export function YoutubeIcon({ className = 'size-4', simple = false }: YoutubeIconProps) {
  if (simple) {
    // Compact single-path icon — good for small indicators inside text/chips
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-label="YouTube"
        role="img"
      >
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }

  // Official brand shape with rounded rectangle background
  return (
    <svg
      className={className}
      viewBox="0 0 256 180"
      aria-label="YouTube"
      role="img"
    >
      <path
        fill="#FF0000"
        d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134Z"
      />
      <path
        fill="#FFFFFF"
        d="m102.421 128.06 66.328-38.418-66.328-38.418z"
      />
    </svg>
  );
}
