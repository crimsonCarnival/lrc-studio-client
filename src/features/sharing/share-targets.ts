/**
 * Where a link can be shared to, as the URL that opens each service's own compose screen.
 * Pure: no window, no React. Discord has no such URL; the sheet copies the link instead.
 */
export type ShareTargetId = 'whatsapp' | 'x' | 'facebook' | 'telegram' | 'reddit' | 'bluesky' | 'email';

export const SHARE_TARGETS: ShareTargetId[] = ['whatsapp', 'x', 'facebook', 'telegram', 'reddit', 'bluesky', 'email'];

export function shareTargetUrl(target: ShareTargetId, url: string, text: string): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const both = encodeURIComponent(text ? `${text} ${url}` : url);
  switch (target) {
    case 'whatsapp': return `https://wa.me/?text=${both}`;
    case 'x': return `https://twitter.com/intent/tweet?url=${u}${text ? `&text=${t}` : ''}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'telegram': return `https://t.me/share/url?url=${u}${text ? `&text=${t}` : ''}`;
    case 'reddit': return `https://www.reddit.com/submit?url=${u}${text ? `&title=${t}` : ''}`;
    case 'bluesky': return `https://bsky.app/intent/compose?text=${both}`;
    case 'email': return `mailto:?subject=${t}&body=${both}`;
  }
}
