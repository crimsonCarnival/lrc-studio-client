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
