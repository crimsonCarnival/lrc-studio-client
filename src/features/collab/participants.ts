import type { CollabMe, CollabParticipant, CollabPeer, CollabRole } from './collab.types'

/** One person in the participants bar. */
export type ParticipantRow = {
  subject: string
  name: string
  colorIndex: number
  role: CollabRole
  online: boolean
  you: boolean
}

/**
 * One row per person (keyed by `subject`), not per connection: someone with two tabs open is
 * one participant, online while any of their tabs is. Me first, then everyone online, then —
 * when the caller can see the member list (the owner) — members with no connection, offline.
 */
export function participantRows(me: CollabMe, peers: CollabPeer[], members: CollabParticipant[] | null): ParticipantRow[] {
  const rows = new Map<string, ParticipantRow>()
  rows.set(me.subject, { subject: me.subject, name: me.name, colorIndex: me.colorIndex, role: me.role, online: true, you: true })
  for (const p of peers) {
    if (rows.has(p.subject)) continue
    rows.set(p.subject, { subject: p.subject, name: p.name, colorIndex: p.colorIndex, role: p.role, online: true, you: false })
  }
  for (const m of members ?? []) {
    if (rows.has(m.subject)) continue
    rows.set(m.subject, { subject: m.subject, name: m.name, colorIndex: m.colorIndex, role: m.role, online: false, you: false })
  }
  return [...rows.values()]
}

/** Up to two initials, from the first two words; whole code points, so an emoji stays intact. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const initials = words.map((w) => [...w][0].toLocaleUpperCase()).join('')
  return initials || '?'
}
