import { describe, expect, it } from 'vitest'
import { accessFor } from './route-access'

describe('accessFor: profile links', () => {
  it.each([
    '/alice', '/Alice', '/ALICE', '/a.b_c-d', '/profile/alice', '/Profile/Alice', '/u/alice', '/U/Alice',
    '/alice/lists/507f1f77bcf86cd799439011', '/u/alice/lists/507f1f77bcf86cd799439011',
    '/profile/alice/lists/507f1f77bcf86cd799439011', '/profile/alice/playlists/507f1f77bcf86cd799439011',
  ])('%s is public', (path) => {
    expect(accessFor(path)).toBe('public')
  })
})

describe('accessFor: private routes cannot be reached by changing case', () => {
  it.each([
    ['/settings', 'auth'], ['/Settings', 'auth'], ['/SETTINGS/profile', 'auth'],
    ['/home', 'auth'], ['/Library', 'auth'], ['/Feed', 'auth'], ['/Notifications', 'auth'], ['/Uploads', 'auth'],
    ['/admin', 'admin'], ['/Admin', 'admin'], ['/ADMIN/users', 'admin'],
    ['/project/abc/edit', 'auth'], ['/Project/abc/Edit', 'auth'],
  ])('%s requires %s', (path, access) => {
    expect(accessFor(path)).toBe(access)
  })
})

describe('accessFor: unchanged behaviour', () => {
  it('keeps explicit public pages public and denies the unknown by default', () => {
    expect(accessFor('/')).toBe('public')
    expect(accessFor('/explore/projects')).toBe('public')
    expect(accessFor('/leaderboard')).toBe('public')
    expect(accessFor('/project/abc')).toBe('public')
    expect(accessFor('/some/deep/unknown/path')).toBe('auth')
  })
})
