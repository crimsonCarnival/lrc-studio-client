import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import i18n from 'i18next';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
    // Chunk load failures happen when a new deploy invalidates old hashed assets.
    // Auto-reload silently to fetch the fresh bundle.
    const msg = error?.message || '';
    const isChunkError =
      msg.includes('dynamically imported module') ||
      msg.includes('Failed to fetch') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Unable to preload');
    if (isChunkError) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'relative',
            minHeight: '100vh',
            backgroundColor: 'var(--color-zinc-950)',
            color: 'var(--color-zinc-100)',
            fontFamily: 'var(--font-sans)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 'clamp(2rem, 6vw, 4rem) clamp(1.5rem, 6vw, 4rem)',
            overflow: 'hidden',
          }}
        >
          {/* Broken LRC lines — app-specific decorative texture */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 'clamp(1.5rem, 4vw, 3rem)',
              left: 'clamp(1.5rem, 6vw, 4rem)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8125rem',
              color: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
              userSelect: 'none',
              lineHeight: 2,
              letterSpacing: '0.02em',
              pointerEvents: 'none',
            }}
          >
            <div>[--:--] ♪ ————</div>
            <div>[--:--] ——————</div>
            <div>[--:--] ♪ ———</div>
          </div>

          <div style={{ maxWidth: '520px' }}>
            <p
              style={{
                fontSize: '0.6875rem',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-primary)',
                marginBottom: '1rem',
              }}
            >
              {i18n.t('error.boundary.label')}
            </p>

            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                color: 'var(--color-zinc-100)',
                marginBottom: '1.25rem',
                whiteSpace: 'pre-line',
              }}
            >
              {i18n.t('error.boundary.title')}
            </h1>

            <p
              style={{
                fontSize: '0.9375rem',
                fontWeight: 300,
                lineHeight: 1.65,
                color: 'color-mix(in srgb, var(--color-zinc-100) 50%, transparent)',
                marginBottom: '2.5rem',
                maxWidth: '38ch',
              }}
            >
              {i18n.t('error.boundary.description')}
            </p>

            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.625rem 1.5rem',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-zinc-950)',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.01em',
              }}
            >
              {i18n.t('error.boundary.reload')}
            </button>
          </div>

          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '2rem',
              right: 'clamp(1.5rem, 6vw, 3rem)',
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'color-mix(in srgb, var(--color-zinc-100) 12%, transparent)',
              userSelect: 'none',
            }}
          >
            ERR_RUNTIME
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
