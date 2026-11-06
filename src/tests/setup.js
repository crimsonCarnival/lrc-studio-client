import '@testing-library/jest-dom/vitest';
import { beforeAll } from 'vitest';
import { i18nReady } from '@/app/i18n';

// i18n init is now gated on a dynamic import of the active language's resource bundle
// (see app/i18n.ts) instead of completing synchronously as a side effect of importing the
// module. Tests that call i18n.changeLanguage() in their own beforeEach need init to have
// already finished — this runs before every test file's own beforeEach/beforeAll, so none
// of them need to know i18n init is now async.
beforeAll(async () => {
  await i18nReady;
});

// jsdom has no ResizeObserver, and Radix measures tooltip/popover content with one. Without
// this, a tooltip that happens to open mid-test (a focused <Tip> trigger) throws and blanks the tree.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
