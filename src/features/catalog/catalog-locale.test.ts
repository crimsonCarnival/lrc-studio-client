import { describe, expect, it } from 'vitest';
import en from '@/locales/en/catalog';
import es from '@/locales/es/catalog';
import enBadges from '@/locales/en/badges';
import esBadges from '@/locales/es/badges';
import { BADGE_REGISTRY } from '@/features/badges/badge-registry';
import { emblemFor } from '@/features/badges/badge-emblems';

function leafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? leafKeys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('catalog locale parity', () => {
  it('has the same keys in en and es', () => {
    expect(leafKeys(es).sort()).toEqual(leafKeys(en).sort());
  });
});

describe('catalog badges', () => {
  const ids = ['scout', 'archivist', 'curator', 'chronicler', 'historian', 'librarian', 'gatekeeper'];

  it.each(ids)('%s has a registry entry, an emblem and en+es names', (id) => {
    expect(BADGE_REGISTRY).toHaveProperty(id);
    expect(emblemFor(id).glyph).toBeTruthy();
    for (const locale of [enBadges, esBadges] as Record<string, { label?: string; tip?: string }>[]) {
      expect(locale[id]?.label).toBeTruthy();
      expect(locale[id]?.tip).toBeTruthy();
    }
  });
});
