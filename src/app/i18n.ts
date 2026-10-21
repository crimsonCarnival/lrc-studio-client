import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function isSupported(value: string | null | undefined): value is SupportedLanguage {
  return !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

// Mirrors the detector config below (querystring 'hl' -> localStorage -> navigator), so the
// language picked here for the eagerly-loaded bundle always matches what
// i18next-browser-languagedetector resolves moments later. If they disagreed, we'd load one
// language's resources but have i18next select another -- exactly the raw-key flash this
// file exists to avoid. Guarded for non-browser test environments (vitest's node-environment
// test files import this transitively via src/tests/setup.js), where `window` itself is
// undefined, not just empty.
function detectInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const qs = new URLSearchParams(window.location.search).get('hl');
    if (isSupported(qs)) return qs;
    const stored = window.localStorage.getItem('i18nextLng');
    if (isSupported(stored)) return stored;
    const base = stored?.split('-')[0];
    if (isSupported(base)) return base;
    const nav = (navigator.language || navigator.languages?.[0] || '').split('-')[0];
    if (isSupported(nav)) return nav;
  } catch {
    // localStorage/navigator inaccessible -- fall through to default
  }
  return 'en';
}

const RESOURCE_LOADERS: Record<SupportedLanguage, () => Promise<{ default: { translation: object } }>> = {
  en: () => import('../locales/en/index.js'),
  es: () => import('../locales/es/index.js'),
};

const initialLanguage = detectInitialLanguage();

// Keyed by language, not a boolean flag: a flag only records that loading *started*, so a
// second caller arriving while the first load is still in flight (the idle preload below
// racing a user-triggered switch, or two switches back to back) would see "already claimed"
// and return immediately -- before the resource bundle actually existed. Memoizing the promise
// itself means every caller, concurrent or sequential, genuinely awaits the same completion.
const languageLoadPromises = new Map<SupportedLanguage, Promise<void>>();

function ensureLanguageLoaded(lng: string): Promise<void> {
  const base = lng.split('-')[0];
  if (!isSupported(base)) return Promise.resolve();
  let promise = languageLoadPromises.get(base);
  if (!promise) {
    promise = RESOURCE_LOADERS[base]().then((mod) => {
      i18n.addResourceBundle(base, 'translation', mod.default.translation, true, true);
    });
    languageLoadPromises.set(base, promise);
  }
  return promise;
}

// Every other locale namespace (33 of them) x the OTHER language used to load unconditionally
// on every single page view -- including the landing page -- regardless of which language the
// visitor actually reads. Only the detected language's resources are bundled into the
// initial i18n.init() call now; i18nReady (awaited by main.tsx before the first render) is
// what used to be a synchronous resources object, so there is no change in what the first
// paint sees for the active language. The other language loads lazily, on demand, the moment
// changeLanguage() is called -- ensureLanguageLoaded() below is wrapped into it precisely so
// that's guaranteed to work. It used to also preload proactively once the page went idle, but
// that cost every session ~47KB gzip for a switch most visitors never make; the on-demand path
// alone already has no raw-key flash, so the idle preload bought only a head start on a rare,
// user-initiated action and was removed.
export const i18nReady: Promise<void> = RESOURCE_LOADERS[initialLanguage]().then((mod) => {
  languageLoadPromises.set(initialLanguage, Promise.resolve());

  return i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: { [initialLanguage]: mod.default },
      lng: initialLanguage,
      fallbackLng: 'en',
      detection: {
        order: ['querystring', 'localStorage', 'navigator'],
        lookupQuerystring: 'hl',
      },
      interpolation: {
        escapeValue: false,
      },
    })
    .then(() => {
      // Wrapped rather than listened-to: i18next emits 'languageChanged' only after the
      // switch has already happened, so a listener there can't stop changeLanguage()'s own
      // promise from resolving before the new language's resources exist. Wrapping the call
      // itself guarantees the resource bundle is present before i18next's own switch logic
      // (and therefore before the wrapped promise resolves for any caller).
      const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
      i18n.changeLanguage = ((lng?: string, callback?: (err: Error | null, t: unknown) => void) => {
        if (!lng) return originalChangeLanguage(lng, callback);
        return ensureLanguageLoaded(lng).then(() => originalChangeLanguage(lng, callback));
      }) as typeof i18n.changeLanguage;
    });
});