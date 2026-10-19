import { describe, expect, it } from 'vitest';
import i18n from 'i18next';
import '@/app/i18n';
import en from './en/artists.js';
import es from './es/artists.js';

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((out, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...out, [path]: value } : { ...out, ...leaves(value, path) };
  }, {});
}

const placeholders = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe('artists locale', () => {
  const english = leaves(en as Tree);
  const spanish = leaves(es as Tree);

  it('has the same keys in English and Spanish', () => {
    expect(Object.keys(spanish).sort()).toEqual(Object.keys(english).sort());
  });

  it('uses the same {{placeholders}} in both languages', () => {
    for (const [key, text] of Object.entries(english)) expect(placeholders(spanish[key])).toEqual(placeholders(text));
  });

  it('has no empty strings', () => {
    for (const text of [...Object.values(english), ...Object.values(spanish)]) expect(text.trim()).not.toBe('');
  });

  it('is registered, falls back to English and never renders a raw key', async () => {
    expect(i18n.options.fallbackLng).toEqual(['en']);
    await i18n.changeLanguage('es');
    expect(i18n.t('artists.primary.label' as never)).toBe('Artistas principales');
    await i18n.changeLanguage('en');
    expect(i18n.t('artists.primary.label' as never)).toBe('Primary artists');
    expect(i18n.t('artists.errors.artist_duplicate' as never, { name: 'A' })).not.toMatch(/^artists\./);
  });
});
