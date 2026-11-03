import { describe, expect, it } from 'vitest'
import { collabMediaToRestored } from './useCollabMedia'

describe('collabMediaToRestored', () => {
  it('maps a YouTube source to a canonical watch URL', () => {
    expect(collabMediaToRestored({ source: 'youtube', url: 'https://youtu.be/x', uploadId: 'u1' }))
      .toBeNull() // no 11-character id
    expect(collabMediaToRestored({ source: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ', uploadId: 'u1' }))
      .toEqual({ type: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  })

  it('keys a Cloudinary source by its upload id, or by its url when there is none', () => {
    expect(collabMediaToRestored({ source: 'cloudinary', url: 'https://res.cloudinary.com/demo/video/upload/a.mp3', uploadId: 'u1' }))
      .toMatchObject({ type: 'cloudinary', id: 'u1', url: 'https://res.cloudinary.com/demo/video/upload/a.mp3' })
    expect(collabMediaToRestored({ source: 'cloudinary', url: 'https://res.cloudinary.com/demo/video/upload/a.mp3', uploadId: null }))
      .toMatchObject({ type: 'cloudinary', id: 'https://res.cloudinary.com/demo/video/upload/a.mp3' })
  })

  it('has nothing to load when the session has no shared media', () => {
    expect(collabMediaToRestored({ source: null, url: null, uploadId: null })).toBeNull()
    expect(collabMediaToRestored({ source: 'youtube', url: null, uploadId: null })).toBeNull()
  })

  it('canonicalizes a YouTube URL with extra parameters, never passing the raw URL through', () => {
    const raw = 'https://m.youtube.com/watch?list=PL1&v=dQw4w9WgXcQ&t=42s&utm_source=x'
    expect(collabMediaToRestored({ source: 'youtube', url: raw, uploadId: null }))
      .toEqual({ type: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  })

  it('rejects a YouTube id with characters outside the id alphabet', () => {
    expect(collabMediaToRestored({ source: 'youtube', url: 'https://youtu.be/abc#de"fghi', uploadId: null })).toBeNull()
  })

  it('rejects Cloudinary media over http', () => {
    expect(collabMediaToRestored({ source: 'cloudinary', url: 'http://res.cloudinary.com/demo/video/upload/a.mp3', uploadId: 'u1' })).toBeNull()
  })

  it('rejects Cloudinary media from another host', () => {
    for (const url of [
      'https://evil.example/demo/video/upload/a.mp3',
      'https://res.cloudinary.com.evil.example/demo/video/upload/a.mp3',
      'https://res.cloudinary.com/demo/video/private/a.mp3',
    ]) {
      expect(collabMediaToRestored({ source: 'cloudinary', url, uploadId: 'u1' })).toBeNull()
    }
  })

  it('rejects malformed media: non-string url, non-object media, unknown source', () => {
    expect(collabMediaToRestored({ source: 'cloudinary', url: 42, uploadId: 'u1' })).toBeNull()
    expect(collabMediaToRestored({ source: 'youtube', url: ['https://youtu.be/dQw4w9WgXcQ'], uploadId: null })).toBeNull()
    expect(collabMediaToRestored('https://youtu.be/dQw4w9WgXcQ')).toBeNull()
    expect(collabMediaToRestored(null)).toBeNull()
    expect(collabMediaToRestored({ source: 'spotify', url: 'https://open.spotify.com/track/x', uploadId: null })).toBeNull()
  })

  it('ignores a non-string upload id and keys the upload by its url', () => {
    expect(collabMediaToRestored({ source: 'cloudinary', url: 'https://res.cloudinary.com/demo/video/upload/a.mp3', uploadId: { $gt: '' } }))
      .toMatchObject({ id: 'https://res.cloudinary.com/demo/video/upload/a.mp3' })
  })
})
