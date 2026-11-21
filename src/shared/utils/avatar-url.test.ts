import { describe, expect, it } from 'vitest';
import { enlargeAvatarUrl } from './avatar-url';

describe('enlargeAvatarUrl', () => {
  it('upsizes Google photo URLs', () => {
    expect(enlargeAvatarUrl('https://lh3.googleusercontent.com/a/abc=s96-c')).toBe('https://lh3.googleusercontent.com/a/abc=s512-c');
  });
  it('leaves other URLs alone', () => {
    const u = 'https://res.cloudinary.com/x/image/upload/a.webp';
    expect(enlargeAvatarUrl(u)).toBe(u);
  });
});
