// client/src/features/preview/preview.styles.js
// Shared size maps for lyric rendering, consumed by usePreview (editor) and
// LyricsStage (public viewer). Keyed by settings.interface.fontSize / .spacing.

export const ACTIVE_FONT_SIZES = {
  small: 'text-lg sm:text-xl lg:text-2xl',
  normal: 'text-2xl sm:text-3xl lg:text-4xl',
  large: 'text-3xl sm:text-4xl lg:text-5xl',
  xlarge: 'text-4xl sm:text-5xl lg:text-6xl',
};

export const INACTIVE_FONT_SIZES = {
  small: 'text-sm sm:text-base lg:text-lg',
  normal: 'text-base sm:text-xl lg:text-2xl',
  large: 'text-lg sm:text-2xl lg:text-3xl',
  xlarge: 'text-xl sm:text-3xl lg:text-4xl',
};

export const ACTIVE_SECONDARY_SIZES = {
  small: 'text-[10px] sm:text-xs',
  normal: 'text-xs sm:text-sm',
  large: 'text-sm sm:text-base',
  xlarge: 'text-base sm:text-lg',
};

export const INACTIVE_SECONDARY_SIZES = {
  small: 'text-[9px] sm:text-[10px]',
  normal: 'text-xs',
  large: 'text-sm',
  xlarge: 'text-sm sm:text-base',
};

export const WRAPPER_SPACING = {
  compact: 'space-y-0',
  normal: 'space-y-1',
  relaxed: 'space-y-3',
};

export const ACTIVE_MARGIN = {
  compact: 'my-0.5 sm:my-1',
  normal: 'my-1 sm:my-2',
  relaxed: 'my-2 sm:my-4',
};
