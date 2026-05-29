import { describe, it, expect } from 'vitest';
import { youtubeThumbnail, resolveUploadCover, resolveCoverImage } from './cover-image';

describe('youtubeThumbnail', () => {
  it('derives from a watch URL', () => {
    expect(youtubeThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
  it('null for junk', () => {
    expect(youtubeThumbnail('nope')).toBeNull();
  });
});

describe('resolveUploadCover', () => {
  it('prefers stored coverImage', () => {
    expect(resolveUploadCover({ coverImage: 'x.jpg', youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' }))
      .toBe('x.jpg');
  });
  it('falls back to youtube thumbnail', () => {
    expect(resolveUploadCover({ youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' }))
      .toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
  it('null when nothing available', () => {
    expect(resolveUploadCover({ source: 'cloudinary' })).toBeNull();
    expect(resolveUploadCover(null)).toBeNull();
  });
});

describe('resolveCoverImage', () => {
  it('uses project.coverImage first', () => {
    expect(resolveCoverImage({ coverImage: 'a.jpg', metadata: { albumArt: 'b.jpg' } }))
      .toBe('a.jpg');
  });
  it('then metadata.albumArt', () => {
    expect(resolveCoverImage({ metadata: { albumArt: 'b.jpg' } })).toBe('b.jpg');
  });
  it('then the upload-derived cover', () => {
    expect(resolveCoverImage({ upload: { youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' } }))
      .toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
  it('null when nothing resolves', () => {
    expect(resolveCoverImage({})).toBeNull();
    expect(resolveCoverImage(null)).toBeNull();
  });
});
