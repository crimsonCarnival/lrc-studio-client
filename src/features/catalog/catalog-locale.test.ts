import { describe, expect, it } from 'vitest';
import en from '@/locales/en/catalog';
import es from '@/locales/es/catalog';

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
