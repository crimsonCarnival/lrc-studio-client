import { gqlRequest } from '@/app/graphql.client'
import { request } from '@/app/api.client'
import type { CollabJoinResult, CollabKickResult, CollabRole, CollabSession } from './collab.types'

// Session and moderation are GraphQL; only the join is REST, because it sets the
// guest cookie. No REST twin and no REST fallback for any of the GraphQL calls.

const SESSION_FIELDS = `
  id publicId allowGuests
  members { subject name role colorIndex inviteId avatarUrl }
  invites { id role revoked createdAt }
`

/** The live session, or null when there is none or the caller is not the owner or a signed-in member. */
export async function getSession(publicId: string): Promise<CollabSession | null> {
  const data = await gqlRequest<{ collabSession: CollabSession | null }>(
    `query CollabSession($publicId: String!) { collabSession(publicId: $publicId) { ${SESSION_FIELDS} } }`,
    { publicId },
  )
  return data.collabSession
}

/** Owner only. Returns the live session if one is already running. */
export async function startSession(publicId: string): Promise<CollabSession> {
  const data = await gqlRequest<{ startCollabSession: CollabSession }>(
    `mutation StartCollabSession($publicId: String!) { startCollabSession(publicId: $publicId) { ${SESSION_FIELDS} } }`,
    { publicId },
  )
  return data.startCollabSession
}

export async function endSession(publicId: string): Promise<boolean> {
  const data = await gqlRequest<{ endCollabSession: boolean }>(
    'mutation EndCollabSession($publicId: String!) { endCollabSession(publicId: $publicId) }',
    { publicId },
  )
  return data.endCollabSession
}

/** Returns the raw invite token. The server keeps only its hash, so this is the one chance to read it. */
export async function createInvite(publicId: string, role: Exclude<CollabRole, 'owner'>): Promise<string> {
  const data = await gqlRequest<{ createCollabInvite: string }>(
    'mutation CreateCollabInvite($publicId: String!, $role: String!) { createCollabInvite(publicId: $publicId, role: $role) }',
    { publicId, role },
  )
  return data.createCollabInvite
}

export async function revokeInvite(publicId: string, inviteId: string): Promise<boolean> {
  const data = await gqlRequest<{ revokeCollabInvite: boolean }>(
    'mutation RevokeCollabInvite($publicId: String!, $inviteId: ID!) { revokeCollabInvite(publicId: $publicId, inviteId: $inviteId) }',
    { publicId, inviteId },
  )
  return data.revokeCollabInvite
}

export async function setRole(publicId: string, subject: string, role: Exclude<CollabRole, 'owner'>): Promise<boolean> {
  const data = await gqlRequest<{ setCollabRole: boolean }>(
    'mutation SetCollabRole($publicId: String!, $subject: String!, $role: String!) { setCollabRole(publicId: $publicId, subject: $subject, role: $role) }',
    { publicId, subject, role },
  )
  return data.setCollabRole
}

/** Kicking a guest also revokes the invite they joined with; its id comes back so the UI can say so. */
export async function kickParticipant(publicId: string, subject: string): Promise<CollabKickResult> {
  const data = await gqlRequest<{ kickCollabParticipant: CollabKickResult }>(
    'mutation KickCollabParticipant($publicId: String!, $subject: String!) { kickCollabParticipant(publicId: $publicId, subject: $subject) { revokedInviteId } }',
    { publicId, subject },
  )
  return data.kickCollabParticipant
}

export async function setGuestAccess(publicId: string, allowGuests: boolean): Promise<boolean> {
  const data = await gqlRequest<{ setCollabGuestAccess: boolean }>(
    'mutation SetCollabGuestAccess($publicId: String!, $allowGuests: Boolean!) { setCollabGuestAccess(publicId: $publicId, allowGuests: $allowGuests) }',
    { publicId, allowGuests },
  )
  return data.setCollabGuestAccess
}

/**
 * Redeems an invite token. Signed-in callers ignore `name`; guests must send one
 * (1–40 chars after trimming) and get an HttpOnly `collabGuest` cookie back.
 * Errors carry the server's code in `err.code` (collab_link_invalid, collab_kicked, ...).
 */
export async function joinSession(token: string, name?: string): Promise<CollabJoinResult> {
  const res = await request<CollabJoinResult>('/collab/join', {
    method: 'POST',
    body: JSON.stringify(name === undefined ? { token } : { token, name }),
  })
  if (!res) throw new Error('collab_join_empty_response')
  return res
}
