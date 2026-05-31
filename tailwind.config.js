export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        '0.5': 'var(--space-0_5)',
        '1': 'var(--space-1)',
        '1.5': 'var(--space-1_5)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        'touch-lg': '2.75rem',   // 44px
        'touch-xl': '3rem',      // 48px
      },
      size: {
        'touch-target': '2.75rem', // 44px minimum
      },
      zIndex: {
        'base': 'var(--z-base)',
        'raised': 'var(--z-raised)',
        'player': 'var(--z-player)',
        'nav': 'var(--z-nav)',
        'mobile-overlay': 'var(--z-mobile-overlay)',
        'sticky': 'var(--z-sticky)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        'modal': 'var(--z-modal)',
        'popover': 'var(--z-popover)',
        'overlay': 'var(--z-overlay)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
        'glow': 'var(--shadow-glow)',
        'glow-strong': 'var(--shadow-glow-strong)',
      },
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'normal': 'var(--duration-normal)',
        'slow': 'var(--duration-slow)',
        'slower': 'var(--duration-slower)',
      },
      transitionTimingFunction: {
        'default': 'var(--ease-default)',
        'bounce': 'var(--ease-bounce)',
      },
      fontSize: {
        'caption': ['var(--text-caption)', { lineHeight: '1.4' }],
        'body-sm': ['var(--text-body-sm)', { lineHeight: '1.5' }],
        'body': ['var(--text-body)', { lineHeight: '1.5' }],
        'subtitle': ['var(--text-subtitle)', { lineHeight: '1.4' }],
        'title': ['var(--text-title)', { lineHeight: '1.3' }],
        'display': ['var(--text-display)', { lineHeight: '1.2' }],
        'display-lg': ['var(--text-display-lg)', { lineHeight: '1.1' }],
      },
    },
  },
  plugins: [
    ({ addVariant }) => {
      addVariant('hover-capable', '@media (hover: hover)');
      addVariant('touch-device', '@media (pointer: coarse)');
      addVariant('motion-safe', '@media (prefers-reduced-motion: no-preference)');
      addVariant('motion-reduce', '@media (prefers-reduced-motion: reduce)');
      addVariant('contrast-more', '@media (prefers-contrast: more)');
      addVariant('data-saver', '@media (prefers-reduced-data: reduce)');
    }
  ],
}