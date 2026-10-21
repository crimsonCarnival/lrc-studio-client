import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'



const __dirname = dirname(fileURLToPath(import.meta.url));

// Puts <link rel="preload"> into index.html at build time for the handful of font
// files that are actually needed to paint the first screen: the icon font, the
// latin-400 cut of Fira Sans (body text) and the latin cut of the Stack Sans Notch
// variable font (headings). Everything else in the @fontsource imports (other
// weights, other unicode-range subsets) stays undiscovered until the stylesheet
// is parsed, same as before — only the ones Lighthouse's critical-chain trace
// flagged as blocking the LCP paint get pulled forward.
//
// It used to be appended from main.tsx, which meant the request could not start until
// the entry chunk had downloaded and parsed — by which point the font was already being
// requested by the stylesheet anyway, so the preload bought nothing. Emitting it into
// the HTML starts the fetch with the document instead.
//
// The filenames are content-hashed, so the URL is only knowable once the bundle exists:
// `order: 'post'` is what gives this hook the bundle to look it up in.
const PRELOAD_FONT_PATTERNS = [
  /material-symbols-subset.*\.woff2$/,
  /fira-sans-latin-400-normal.*\.woff2$/,
  /stack-sans-notch-latin-wght-normal.*\.woff2$/,
];

function preloadCriticalFonts() {
  return {
    name: 'preload-critical-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return [];
        const files = Object.values(ctx.bundle);
        return PRELOAD_FONT_PATTERNS
          .map((pattern) => files.find((f) => pattern.test(f.fileName))?.fileName)
          .filter(Boolean)
          .map((href) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `/${href}` },
            injectTo: 'head',
          }));
      },
    },
  };
}

// i18n.ts's `i18nReady` only bundles the detected language into the initial
// i18next.init() call, but the dynamic import() that fetches that bundle is
// buried inside the module graph — so the browser has no way to discover its
// URL until the entry chunk has downloaded AND parsed far enough to reach
// that line. The chunk is knowable at build time (same situation as the
// fonts above), so modulepreloading it removes that serial hop.
//
// There is no visitor-specific HTML on this static deploy, so this can only
// preload one language unconditionally. 'en' is picked because it is
// already this codebase's fallback everywhere else: index.html's
// `lang="en"`, i18next's `fallbackLng: 'en'`, and proxy.ts's OG-metadata
// default all agree. That is an assumption about traffic, not a measurement
// — if most real visitors are actually Spanish-reading, this should
// preload 'es' instead, or the whole thing should be revisited in favor of
// injecting the right one per-request the way proxy.ts already does for
// crawlers (bigger change: that path is deliberately skipped for humans
// today to avoid a function invocation on every page load).
//
// A wrong guess costs the *other* language's visitors one wasted ~40KB
// chunk fetch — strictly worse than today only for them, and only by that
// one chunk; everyone's own-language load is unaffected.
function preloadDetectedLocale() {
  const PRELOAD_LOCALE = 'en';
  return {
    name: 'preload-detected-locale',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return [];
        const chunk = Object.values(ctx.bundle).find(
          (f) => f.type === 'chunk' && f.facadeModuleId?.replace(/\\/g, '/').endsWith(`/locales/${PRELOAD_LOCALE}/index.js`)
        );
        if (!chunk) return [];
        return [{
          tag: 'link',
          attrs: { rel: 'modulepreload', href: `/${chunk.fileName}` },
          injectTo: 'head',
        }];
      },
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // React Compiler via Babel is skipped in dev — Babel on every file tanks HMR speed.
      // Production still gets the optimization.
      babel: mode === 'production' ? {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      } : undefined,
    }),
    tailwindcss(),
    preloadCriticalFonts(),
    preloadDetectedLocale(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@features': resolve(__dirname, 'src/features'),
      '@ui': resolve(__dirname, 'src/shared/ui'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/render-api': {
        target: 'https://lrc-editor-server.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/render-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error (Render):', err);
          });
          proxy.on('proxyReq', (_, req, _res) => {
            console.log('Proxying request to Render:', req.method, req.url);
          });
        },
      },
    },
  },
  // Strip console.log/warn/debug in production; keep console.error
  esbuild: mode === 'production' ? {
    drop: ['debugger'],
    pure: ['console.log', 'console.warn', 'console.debug', 'console.info'],
  } : {},
  envPrefix: 'VITE_',
  build: {
    chunkSizeWarningLimit: 500,
    // Hidden: maps are emitted for debugging large prod bundles, but with no
    // //# sourceMappingURL comment in the JS, so DevTools/Lighthouse don't
    // auto-load them for anyone just browsing the site.
    sourcemap: 'hidden',
    modulePreload: {
      // vendor-framer is grouped as a named chunk (see manualChunks below) so the many
      // route-level consumers share one cached copy, but that grouping makes the
      // bundler treat it as a stable "vendor" bucket and modulepreload it from every
      // page — even ones whose only path to it is a conditionally-rendered dynamic
      // import (AppHeader's ScrollProgress, never mounted on project pages at all).
      // That is the 85%-unused vendor-framer bytes Lighthouse flagged on initial load.
      // Dropping it from the resolved preload list stops the forced eager fetch;
      // dynamic import() still fetches it normally once something actually renders it.
      resolveDependencies: (_filename, deps) => deps.filter((dep) => !dep.includes('vendor-framer')),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Isolate heavy 3D libs — only used on guest landing page
          if (id.includes('node_modules/three') ||
              id.includes('node_modules/@react-three') ||
              id.includes('node_modules/troika')) {
            return 'vendor-3d';
          }
          // Core React runtime — loaded first
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          // i18n — large but only needed after initial paint
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next') || id.includes('node_modules/i18next-browser-languagedetector')) {
            return 'vendor-i18n';
          }
          // Toasts — lightweight, keep separate for cache efficiency
          if (id.includes('node_modules/react-hot-toast')) {
            return 'vendor-toast';
          }
          // Waveform — heavy, never needed on initial render
          if (id.includes('node_modules/wavesurfer.js')) {
            return 'vendor-wavesurfer';
          }
          // UI icon library — large, tree-shaken but still substantial
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          // Radix UI primitives (used by shadcn components)
          if (id.includes('node_modules/radix-ui') || id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }
          // Tanstack Virtual — only needed when Preview/lists mount
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-tanstack';
          }
          // Validation
          if (id.includes('node_modules/zod')) {
            return 'vendor-zod';
          }
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          // Animation — heavy, imported for drag-reorder in editor layout
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer';
          }
          // Socket.io client
          if (id.includes('node_modules/socket.io-client') || id.includes('node_modules/engine.io-client') || id.includes('node_modules/@socket.io')) {
            return 'vendor-socket';
          }
          // GraphQL client
          if (id.includes('node_modules/graphql-request') || id.includes('node_modules/graphql')) {
            return 'vendor-graphql';
          }
          // WebAuthn — only needed on passkey flows
          if (id.includes('node_modules/@simplewebauthn')) {
            return 'vendor-webauthn';
          }
          // OGL — 3D library used on landing page
          if (id.includes('node_modules/ogl')) {
            return 'vendor-ogl';
          }
          // Fingerprinting — loaded once at session start
          if (id.includes('node_modules/@fingerprintjs')) {
            return 'vendor-fingerprint';
          }
          // Password strength — only needed on auth pages
          if (id.includes('node_modules/zxcvbn')) {
            return 'vendor-zxcvbn';
          }
        },
      },
    },
  },
}))
