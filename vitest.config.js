import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@features': resolve(__dirname, 'src/features'),
      '@services': resolve(__dirname, 'src/services'),
      '@ui': resolve(__dirname, 'src/shared/ui'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    // The app is TypeScript; the original globs only matched .js/.jsx, so a
    // .test.ts file was silently never collected.
    include: ['src/**/*.test.{js,jsx,ts,tsx}', 'src/**/*.spec.{js,jsx,ts,tsx}'],
    exclude: ['src/tests/setup.js', 'node_modules/**'],
  },
});
