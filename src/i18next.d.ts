import 'i18next';
import type en from './locales/en/index.js';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    ns: readonly ['translation'];
    resources: {
      translation: (typeof en)['translation'];
    };
  }
}
