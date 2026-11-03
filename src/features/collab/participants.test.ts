import { describe, expect, it } from 'vitest'
import type { CollabMe, CollabParticipant, CollabPeer } from './collab.types'
import { initialsOf, participantRows } from './participants'

const me: CollabMe = { subject: 'user:me', name: 'Ana Ruiz', colorIndex: 1, role: 'owner', conn: 'c1', clientId: 1 }

const peer = (clientId: number, subject: string, name: string, over: Partial<CollabPeer> = {}): CollabPeer => ({
  clientId, subject, name, colorIndex: 3, role: 'editor', pointer: null, playhead: null, activeLineId: null, duration: null, receivedAt: 0, ...over,
})

const member = (subject: string, name: string, over: Partial<CollabParticipant> = {}): CollabParticipant => ({
  subject, name, role: 'editor', colorIndex: 4, inviteId: null, ...over,
})

describe('participantRows', () => {
  it('lists me first, then one row per online person however many tabs they have', () => {
    const rows = participantRows(me, [peer(2, 'user:luis', 'Luis'), peer(3, 'user:luis', 'Luis'), peer(4, 'guest:x', 'Eva', { role: 'viewer' })], null)
    expect(rows.map((r) => [r.subject, r.online, r.you])).toEqual([
      ['user:me', true, true],
      ['user:luis', true, false],
      ['guest:x', true, false],
    ])
    expect(rows[2].role).toBe('viewer')
  })

  it('my own other tabs do not show as a second me', () => {
    const rows = participantRows(me, [peer(9, 'user:me', 'Ana Ruiz', { role: 'owner' })], null)
    expect(rows).toHaveLength(1)
  })

  it('adds members who are not connected as offline (owner view)', () => {
    const rows = participantRows(me, [peer(2, 'user:luis', 'Luis')], [
      member('user:me', 'Ana Ruiz', { role: 'owner' }),
      member('user:luis', 'Luis'),
      member('guest:z', 'Zoe', { role: 'viewer', colorIndex: 6 }),
    ])
    expect(rows.map((r) => [r.subject, r.online])).toEqual([
      ['user:me', true],
      ['user:luis', true],
      ['guest:z', false],
    ])
    expect(rows[2]).toMatchObject({ name: 'Zoe', role: 'viewer', colorIndex: 6 })
  })
})

describe('initialsOf', () => {
  it('takes the first letter of up to two words', () => {
    expect(initialsOf('Ana Ruiz')).toBe('AR')
    expect(initialsOf('  luis  ')).toBe('L')
    expect(initialsOf('María José López')).toBe('MJ')
    expect(initialsOf('😀 face')).toBe('😀F')
    expect(initialsOf('')).toBe('?')
  })
})
