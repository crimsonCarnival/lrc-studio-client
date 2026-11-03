import { describe, expect, it } from 'vitest'
import { collabMediaToRestored } from './useCollabMedia'

describe('collabMediaToRestored', () => {
  it('maps a YouTube source to the player descriptor', () => {
    expect(collabMediaToRestored({ source: 'youtube', url: 'https://youtu.be/x', uploadId: 'u1' }))
      .toEqual({ type: 'youtube', url: 'https://youtu.be/x' })
  })

  it('keys a Cloudinary source by its upload id, or by its url when there is none', () => {
    expect(collabMediaToRestored({ source: 'cloudinary', url: 'https://res.cloudinary.com/a.mp3', uploadId: 'u1' }))
      .toMatchObject({ type: 'cloudinary', id: 'u1', url: 'https://res.cloudinary.com/a.mp3' })
    expect(collabMediaToRestored({ source: 'cloudinary', url: 'https://res.cloudinary.com/a.mp3', uploadId: null }))
      .toMatchObject({ type: 'cloudinary', id: 'https://res.cloudinary.com/a.mp3' })
  })

  it('has nothing to load when the session has no shared media', () => {
    expect(collabMediaToRestored({ source: null, url: null, uploadId: null })).toBeNull()
    expect(collabMediaToRestored({ source: 'youtube', url: null, uploadId: null })).toBeNull()
  })
})
