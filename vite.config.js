import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'



const __dirname = dirname(fileURLToPath(import.meta.url));

// Puts <link rel="preload"> for the icon font into index.html at build time.
//
// It used to be appended from main.tsx, which meant the request could not start until
// the entry chunk had downloaded and parsed — by which point the font was already being
// requested by the stylesheet anyway, so the preload bought nothing. Emitting it into
// the HTML starts the fetch with the document instead.
//
// The filename is content-hashed, so the URL is only knowable once the bundle exists:
// `order: 'post'` is what gives this hook the bundle to look it up in.
function preloadIconFont() {
  return {
    name: 'preload-icon-font',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const href = ctx.bundle
          ? Object.values(ctx.bundle).find((f) => /material-symbols-subset.*\.woff2$/.test(f.fileName))?.fileName
          : null;
        if (!href) return [];
        return [{
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `/${href}` },
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
    preloadIconFont(),
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
