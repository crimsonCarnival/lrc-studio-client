// Vercel Speed Insights reports the page URL with every web-vitals event. An invite link
// carries its secret token in the path, so the token is replaced before the event leaves.

type InsightsEvent = { type: 'vital'; url: string; route?: string }

// Case-insensitive: React Router matches /Join/<token> to the same route.
const JOIN_PATH = /^\/join\/[^/?#]+/i

/** `/join/<token>` becomes `/join/:token` (query and hash dropped with it); other paths are untouched. */
export function redactPath(path: string): string {
  return JOIN_PATH.test(path) ? '/join/:token' : path
}

/** `beforeSend` for <SpeedInsights />: same event, with the invite token taken out of its URL (and route, if set). */
export function redactInsightsEvent<E extends InsightsEvent>(event: E): E {
  let url: URL
  try {
    url = new URL(event.url)
  } catch {
    // Not an absolute URL: treat the whole string as a path.
    return JOIN_PATH.test(event.url) ? { ...event, url: redactPath(event.url) } : redactRoute(event)
  }
  if (!JOIN_PATH.test(url.pathname)) return redactRoute(event)
  return redactRoute({ ...event, url: `${url.origin}${redactPath(url.pathname)}` })
}

function redactRoute<E extends InsightsEvent>(event: E): E {
  return event.route && JOIN_PATH.test(event.route) ? { ...event, route: redactPath(event.route) } : event
}
