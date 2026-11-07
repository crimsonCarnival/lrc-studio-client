import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import en from '@/locales/en/collab';
import es from '@/locales/es/collab';

describe('collab.presence.more plurals', () => {
  it.each([
    ['en', en, 1, '1 more participant'],
    ['en', en, 3, '3 more participants'],
    ['es', es, 1, '1 participante más'],
    ['es', es, 3, '3 participantes más'],
  ])('%s %i', async (lng, bundle, count, expected) => {
    const i = i18next.createInstance();
    await i.init({ lng, resources: { [lng]: { collab: bundle as never } }, ns: ['collab'], defaultNS: 'collab', interpolation: { escapeValue: false } });
    expect(i.t('presence.more', { count })).toBe(expected);
  });
});
