import { describe, expect, it } from 'vitest';
import { audioCorsMode, isReadableAudioUrl } from './media-cors';

const CLOUDINARY = 'https://res.cloudinary.com/demo/video/upload/song.mp3';

describe('audioCorsMode', () => {
  it('requests CORS only from hosts known to send the headers', () => {
    expect(audioCorsMode(CLOUDINARY)).toBe('anonymous');
    expect(audioCorsMode('https://example.com/song.mp3')).toBeUndefined();
    expect(audioCorsMode('blob:http://localhost/abc')).toBeUndefined();
    expect(audioCorsMode(null)).toBeUndefined();
  });
});

describe('isReadableAudioUrl', () => {
  it('accepts local files, same-origin and CORS hosts', () => {
    expect(isReadableAudioUrl('blob:http://localhost/abc')).toBe(true);
    expect(isReadableAudioUrl(CLOUDINARY)).toBe(true);
    expect(isReadableAudioUrl(`${window.location.origin}/audio/song.mp3`)).toBe(true);
  });

  it('refuses a foreign host that would play as silence once routed', () => {
    expect(isReadableAudioUrl('https://example.com/song.mp3')).toBe(false);
    expect(isReadableAudioUrl('')).toBe(false);
    expect(isReadableAudioUrl(undefined)).toBe(false);
  });
});
