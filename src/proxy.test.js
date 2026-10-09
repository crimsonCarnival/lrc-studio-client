import { describe, it, expect } from 'vitest';
import { buildTags, escapeAttr, injectTags, isCrawler, resolveLang, fallbackMeta } from '../proxy';

describe('isCrawler', () => {
  const bots = [
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0',
    'WhatsApp/2.23.20.0 A',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    'TelegramBot (like TwitterBot)',
    'LinkedInBot/1.0 (compatible; Mozilla/5.0)',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0)',
  ];
  it.each(bots)('matches %s', (ua) => expect(isCrawler(ua)).toBe(true));

  it('does not match a real browser', () => {
    expect(isCrawler(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    )).toBe(false);
  });

  it('does not match an iPhone Safari UA', () => {
    expect(isCrawler(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    )).toBe(false);
  });

  it('treats a missing UA as human so the CDN serves it', () => {
    expect(isCrawler(null)).toBe(false);
    expect(isCrawler('')).toBe(false);
  });
});

describe('escapeAttr', () => {
  it('neutralises an attribute break-out', () => {
    const out = escapeAttr('" onload="alert(1)');
    expect(out).not.toContain('"');
    expect(out).toBe('&quot; onload=&quot;alert(1)');
  });

  it('neutralises a tag break-out', () => {
    const out = escapeAttr('"><script>alert(1)</script>');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).not.toContain('"');
  });

  it('escapes & first so entities are not double-escaped', () => {
    expect(escapeAttr('Rock & Roll')).toBe('Rock &amp; Roll');
    expect(escapeAttr('&lt;')).toBe('&amp;lt;');
  });

  it('escapes single quotes', () => {
    expect(escapeAttr("' onmouseover='x")).toBe('&#39; onmouseover=&#39;x');
  });

  it('renders null/undefined as empty, never the literal string', () => {
    expect(escapeAttr(null)).toBe('');
    expect(escapeAttr(undefined)).toBe('');
  });
});

describe('resolveLang', () => {
  const u = (s) => new URL(`https://www.lrcstudio.app${s}`);

  it('prefers ?hl= over Accept-Language', () => {
    expect(resolveLang(u('/?hl=es'), 'en-US,en;q=0.9')).toBe('es');
    expect(resolveLang(u('/?hl=en'), 'es-CO,es;q=0.9')).toBe('en');
  });

  it('falls back to Accept-Language', () => {
    expect(resolveLang(u('/'), 'es-CO,es;q=0.9')).toBe('es');
  });

  it('defaults to en', () => {
    expect(resolveLang(u('/'), null)).toBe('en');
    expect(resolveLang(u('/'), 'fr-FR,fr;q=0.9')).toBe('en');
  });
});

describe('buildTags', () => {
  const base = fallbackMeta(new URL('https://www.lrcstudio.app/project/abc'), 'en');

  it('emits the required OG and Twitter tags', () => {
    const tags = buildTags(base);
    for (const prop of [
      'og:title', 'og:type', 'og:url', 'og:description', 'og:site_name',
      'og:image', 'og:image:secure_url', 'og:image:type', 'og:image:width',
      'og:image:height', 'og:image:alt', 'og:locale',
    ]) {
      expect(tags).toContain(`property="${prop}"`);
    }
    for (const name of [
      'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt',
    ]) {
      expect(tags).toContain(`name="${name}"`);
    }
    expect(tags).toContain('content="summary_large_image"');
  });

  it('adds music:musician only for a song', () => {
    expect(buildTags({ ...base, type: 'music.song', music: { musician: 'Artist' } }))
      .toContain('property="music:musician"');
    expect(buildTags(base)).not.toContain('music:musician');
  });

  it('adds profile:username only for a profile', () => {
    expect(buildTags({ ...base, type: 'profile', profile: { username: 'someone' } }))
      .toContain('property="profile:username"');
    expect(buildTags(base)).not.toContain('profile:username');
  });

  it('escapes a hostile title into every tag that carries it', () => {
    const tags = buildTags({ ...base, title: '"><script>alert(1)</script>' });
    expect(tags).not.toContain('<script>');
    expect(tags).not.toContain('"><');
  });
});

describe('injectTags', () => {
  const shell = `<!doctype html><html><head>
    <title>LRC Studio</title>
    <meta name="description" content="old" />
    <meta name="theme-color" content="#000" />
    <link rel="canonical" href="https://www.lrcstudio.app/" />
    <meta property="og:title" content="old og" />
    <meta name="twitter:card" content="summary" />
  </head><body><div id="root"></div></body></html>`;

  const meta = fallbackMeta(new URL('https://www.lrcstudio.app/'), 'en');
  const out = injectTags(shell, buildTags(meta));

  it('leaves exactly one title', () => {
    expect(out.match(/<title>/gi)?.length).toBe(1);
  });

  it('leaves exactly one description', () => {
    expect(out.match(/name="description"/gi)?.length).toBe(1);
  });

  it('leaves exactly one canonical and one theme-color', () => {
    expect(out.match(/rel="canonical"/gi)?.length).toBe(1);
    expect(out.match(/name="theme-color"/gi)?.length).toBe(1);
  });

  it('drops the stale og/twitter tags rather than duplicating them', () => {
    expect(out).not.toContain('old og');
    expect(out.match(/property="og:title"/gi)?.length).toBe(1);
    expect(out.match(/name="twitter:card"/gi)?.length).toBe(1);
  });

  it('keeps the app mount point intact', () => {
    expect(out).toContain('<div id="root"></div>');
  });

  it('injects before </head>', () => {
    expect(out.indexOf('og:title')).toBeLessThan(out.indexOf('</head>'));
  });
});
