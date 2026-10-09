import { next } from '@vercel/functions';

/**
 * Vercel Routing Middleware — Open Graph tags for social crawlers.
 *
 * Crawlers do not run JavaScript, so a static SPA unfurls as whatever is in the
 * shipped `index.html` — one generic title for every URL. This intercepts
 * crawler requests before the CDN cache, resolves the real metadata from the
 * API, and returns `index.html` with the tags injected.
 *
 * Humans are not touched: a non-crawler request returns `next()` before any
 * work happens, so normal traffic keeps being served straight from the CDN.
 * Injecting for everyone would add a function invocation to every page load and
 * buy nothing, because browsers run the app.
 */

/**
 * Substrings matched case-insensitively against the UA.
 *
 * Deliberately substring-based rather than anchored: crawler UAs carry version
 * and URL noise around the token (`facebookexternalhit/1.1 (+http://…)`). The
 * cost of a false positive is only that a human is served correct, fully
 * functional HTML with extra meta tags, so erring wide is safe.
 */
const CRAWLER_TOKENS = [
  'facebookexternalhit',
  'facebookcatalog',
  'facebot',
  'twitterbot',
  'whatsapp',
  'discordbot',
  'telegrambot',
  'linkedinbot',
  'slackbot',
  'slack-imgproxy',
  'googlebot',
  'google-inspectiontool',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'baiduspider',
  'redditbot',
  'pinterest',
  'vkshare',
  'applebot',
  'mastodon',
  'embedly',
  'quora link preview',
  'nuzzel',
  'outbrain',
  'skypeuripreview',
  'iframely',
  'opengraph.io',
  'developers.google.com/+/web/snippet',
];

/** Routes whose metadata the API can resolve. Everything else gets the brand card. */
const MATCHER = [
  '/',
  '/project/:path*',
  '/profile/:path*',
  '/u/:path*',
  '/explore/:path*',
  '/leaderboard',
];

/**
 * `matcher` is declared in vercel.json next to `proxy.entrypoint`, which is the
 * platform-level source of truth for a non-Next.js project. MATCHER above is
 * exported only so a test can assert the two stay in sync.
 */
export const config = {
  runtime: 'nodejs',
};

export { MATCHER };

const API_ORIGIN = (process.env.OG_API_ORIGIN || 'https://api.lrcstudio.app').replace(/\/+$/, '');
// www is the canonical host throughout this repo: index.html's <link rel="canonical">,
// robots.txt's Sitemap line and every public/sitemap.xml entry all use it. og:url and
// canonical disagreeing is a duplicate-content bug, so this default follows them.
const SITE_ORIGIN = (process.env.OG_SITE_ORIGIN || 'https://www.lrcstudio.app').replace(/\/+$/, '');
const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-default.png`;

/** A crawler that waits on us is a crawler that gives up. Budget the API call hard. */
const META_TIMEOUT_MS = 2500;

type OgMetaImage = {
  url: string;
  secureUrl: string;
  type: string;
  width: number;
  height: number;
  alt: string;
};

type OgMeta = {
  type: string;
  title: string;
  description: string;
  canonical: string;
  siteName: string;
  locale: string;
  localeAlternate: string[];
  robots: string;
  themeColor: string;
  image: OgMetaImage;
  music?: { musician?: string };
  profile?: { username?: string };
};

/**
 * Escapes a value for use inside a double-quoted HTML attribute.
 *
 * Every interpolated value goes through this. The API is first-party, but its
 * values are user-authored (song titles, display names, lyrics, bios) and a
 * title containing `" onload="` or `"><script>` would otherwise break out of
 * the attribute and execute. `&` must be replaced first or it would double-
 * escape the entities introduced after it.
 */
function escapeAttr(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_TOKENS.some((token) => ua.includes(token));
}

/**
 * `?hl=` wins, then `Accept-Language`. localStorage — the app's second
 * detection source — does not exist here, and a crawler has none anyway.
 */
function resolveLang(url: URL, acceptLanguage: string | null): 'en' | 'es' {
  const hl = url.searchParams.get('hl');
  if (hl && hl.toLowerCase().startsWith('es')) return 'es';
  if (hl) return 'en';
  if (acceptLanguage && /(^|,)\s*es\b/i.test(acceptLanguage)) return 'es';
  return 'en';
}

function fallbackMeta(url: URL, lang: 'en' | 'es'): OgMeta {
  const canonical = `${SITE_ORIGIN}${url.pathname}`;
  const copy = lang === 'es'
    ? {
        title: 'LRC Studio — Sincronización profesional de letras',
        description: 'Sincroniza letras con cualquier canción y exporta archivos .lrc, .srt o karaoke.',
      }
    : {
        title: 'LRC Studio — Professional Lyric Synchronization & Editing',
        description: 'Sync lyrics to any song and export .lrc, .srt or word-level karaoke files.',
      };
  return {
    type: 'website',
    title: copy.title,
    description: copy.description,
    canonical,
    siteName: 'LRC Studio',
    locale: lang === 'es' ? 'es_CO' : 'en_US',
    localeAlternate: [lang === 'es' ? 'en_US' : 'es_CO'],
    robots: 'index,follow',
    themeColor: '#232136',
    image: {
      url: DEFAULT_IMAGE,
      secureUrl: DEFAULT_IMAGE,
      type: 'image/png',
      width: 1200,
      height: 630,
      alt: 'LRC Studio',
    },
  };
}

async function fetchMeta(url: URL, lang: 'en' | 'es'): Promise<OgMeta> {
  const target = `${API_ORIGIN}/og/meta?path=${encodeURIComponent(url.pathname)}&hl=${lang}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), META_TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return fallbackMeta(url, lang);
    const body = (await res.json()) as Partial<OgMeta>;
    // Merge over the fallback so a partial or reshaped payload can never
    // produce a tag with `undefined` in it.
    const base = fallbackMeta(url, lang);
    return {
      ...base,
      ...body,
      image: { ...base.image, ...(body.image ?? {}) },
    };
  } catch {
    // Timeout, DNS, cold start, malformed JSON — the crawler still gets a
    // valid branded card rather than a 500.
    return fallbackMeta(url, lang);
  } finally {
    clearTimeout(timer);
  }
}

function buildTags(meta: OgMeta): string {
  const tags: string[] = [
    `<title>${escapeAttr(meta.title)}</title>`,
    `<meta name="description" content="${escapeAttr(meta.description)}">`,
    `<link rel="canonical" href="${escapeAttr(meta.canonical)}">`,
    `<meta name="robots" content="${escapeAttr(meta.robots)}">`,
    `<meta name="theme-color" content="${escapeAttr(meta.themeColor)}">`,
    `<meta property="og:site_name" content="${escapeAttr(meta.siteName)}">`,
    `<meta property="og:type" content="${escapeAttr(meta.type)}">`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}">`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}">`,
    `<meta property="og:url" content="${escapeAttr(meta.canonical)}">`,
    `<meta property="og:locale" content="${escapeAttr(meta.locale)}">`,
    `<meta property="og:image" content="${escapeAttr(meta.image.url)}">`,
    `<meta property="og:image:secure_url" content="${escapeAttr(meta.image.secureUrl)}">`,
    `<meta property="og:image:type" content="${escapeAttr(meta.image.type)}">`,
    `<meta property="og:image:width" content="${escapeAttr(meta.image.width)}">`,
    `<meta property="og:image:height" content="${escapeAttr(meta.image.height)}">`,
    `<meta property="og:image:alt" content="${escapeAttr(meta.image.alt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}">`,
    `<meta name="twitter:image" content="${escapeAttr(meta.image.url)}">`,
    `<meta name="twitter:image:alt" content="${escapeAttr(meta.image.alt)}">`,
  ];

  for (const alt of meta.localeAlternate ?? []) {
    tags.push(`<meta property="og:locale:alternate" content="${escapeAttr(alt)}">`);
  }
  if (meta.type === 'music.song' && meta.music?.musician) {
    tags.push(`<meta property="music:musician" content="${escapeAttr(meta.music.musician)}">`);
  }
  if (meta.type === 'profile' && meta.profile?.username) {
    tags.push(`<meta property="profile:username" content="${escapeAttr(meta.profile.username)}">`);
  }
  return tags.join('\n    ');
}

/**
 * Strips the tags the static document already carries before injecting ours.
 *
 * Two `<title>` elements or two `name="description"` metas is a real cause of
 * wrong unfurls — crawlers differ on which one wins, so the preview can
 * disagree with the page.
 */
export function injectTags(html: string, tags: string): string {
  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+name=["']theme-color["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+(?:property|name)=["'](?:og|twitter|music|profile):[^"']*["'][^>]*>\s*/gi, '');

  if (/<\/head>/i.test(stripped)) {
    return stripped.replace(/<\/head>/i, `    ${tags}\n  </head>`);
  }
  // No </head> should be impossible for our own document, but emitting the
  // tags somewhere beats silently dropping them.
  return `${tags}\n${stripped}`;
}

export { buildTags, escapeAttr, isCrawler, resolveLang, fallbackMeta };

export default async function proxy(request: Request): Promise<Response> {
  if (!isCrawler(request.headers.get('user-agent'))) return next();

  const url = new URL(request.url);
  const lang = resolveLang(url, request.headers.get('accept-language'));

  let html: string;
  try {
    // `/index.html` is a real static file and is outside `matcher`, so this
    // does not re-enter the proxy.
    const shell = await fetch(new URL('/index.html', url.origin), {
      headers: { accept: 'text/html' },
    });
    if (!shell.ok) return next();
    html = await shell.text();
  } catch {
    // If the shell cannot be read there is nothing to inject into; let the
    // crawler have the normal CDN response rather than an error.
    return next();
  }

  const meta = await fetchMeta(url, lang);

  return new Response(injectTags(html, buildTags(meta)), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Short, so a re-scrape after publishing or renaming picks up the change.
      'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
      vary: 'user-agent, accept-language',
    },
  });
}
