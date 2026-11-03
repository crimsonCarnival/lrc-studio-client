import { describe, expect, it } from 'vitest'
import { redactInsightsEvent, redactPath } from './speed-insights'

describe('speed insights redaction', () => {
  it('replaces the invite token in a join path', () => {
    expect(redactPath('/join/abc123XYZ_-token')).toBe('/join/:token')
  })

  it('leaves other paths alone', () => {
    for (const p of ['/', '/home', '/join', '/session/k3x9a2c7qm', '/ana/joint-song-abc123']) {
      expect(redactPath(p)).toBe(p)
    }
  })

  it('redacts the event url, dropping query and hash, and keeps the rest of the event', () => {
    const out = redactInsightsEvent({ type: 'vital', url: 'https://www.lrcstudio.app/join/abc123secret?x=1#y' })
    expect(out).toEqual({ type: 'vital', url: 'https://www.lrcstudio.app/join/:token' })
    expect(JSON.stringify(out)).not.toContain('abc123secret')
  })

  it('passes other events through unchanged', () => {
    const ev = { type: 'vital' as const, url: 'https://www.lrcstudio.app/explore?q=a' }
    expect(redactInsightsEvent(ev)).toBe(ev)
  })

  it('redacts a join path in the route too', () => {
    const out = redactInsightsEvent({ type: 'vital', url: 'https://www.lrcstudio.app/join/abc123secret', route: '/join/abc123secret' })
    expect(out.route).toBe('/join/:token')
  })
})
