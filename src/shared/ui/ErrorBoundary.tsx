import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

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
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 font-sans p-8">
          <div className="max-w-md w-full bg-white/[0.04] border border-white/10 rounded-2xl p-8 text-center">
            <div className="size-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-6 text-2xl">
              ⚠
            </div>
            <h1 className="text-lg font-semibold mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              The app encountered an unexpected error. You can try reloading, or reset all data to recover.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 font-semibold text-sm cursor-pointer"
              >
                Reload
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="flex-1 py-2.5 bg-red-600 rounded-xl text-white font-semibold text-sm cursor-pointer"
              >
                Reset &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
