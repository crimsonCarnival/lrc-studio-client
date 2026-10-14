// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { SHARE_TARGETS, shareTargetUrl } from './share-targets';

const URL_ = 'https://api.lrcstudio.app/og/project/abc?x=1&y=2';

describe('shareTargetUrl', () => {
  it('encodes the link so its own query string survives', () => {
    for (const target of SHARE_TARGETS) {
      const out = shareTargetUrl(target, URL_, 'Song & Artist');
      expect(out).toContain(encodeURIComponent(URL_));
      expect(out).not.toContain('x=1&y=2');
    }
  });

  it('builds each service\'s compose URL', () => {
    expect(shareTargetUrl('whatsapp', 'https://a.b/c', 'Hi')).toBe('https://wa.me/?text=Hi%0Ahttps%3A%2F%2Fa.b%2Fc');
    expect(shareTargetUrl('x', 'https://a.b/c', 'Hi')).toBe('https://twitter.com/intent/tweet?url=https%3A%2F%2Fa.b%2Fc&text=Hi');
    expect(shareTargetUrl('facebook', 'https://a.b/c', 'Hi')).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fa.b%2Fc');
    expect(shareTargetUrl('email', 'https://a.b/c', 'Hi')).toBe('mailto:?subject=Hi&body=Hi%20https%3A%2F%2Fa.b%2Fc');
  });

  it('leaves out an empty text instead of sending a blank parameter', () => {
    expect(shareTargetUrl('telegram', 'https://a.b/c', '')).toBe('https://t.me/share/url?url=https%3A%2F%2Fa.b%2Fc');
    expect(shareTargetUrl('whatsapp', 'https://a.b/c', '')).toBe('https://wa.me/?text=https%3A%2F%2Fa.b%2Fc');
  });
});
