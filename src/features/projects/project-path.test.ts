import { describe, it, expect } from 'vitest';
import {
  slugify, projectPath, projectEditPath, publicIdFromSlugId,
  isProjectViewPath, isEditorPath, isProjectPath,
} from './project-path';

// These cases are copied from the server's project-slug tests: the two
// implementations have to agree byte for byte or a shared link resolves to a
// different canonical URL than the one the server put in og:url.
describe('slugify — must match the server byte for byte', () => {
  it('strips latin diacritics but leaves kana dakuten alone', () => {
    expect(slugify('Café')).toBe('cafe');
    expect(slugify('がぎ')).toBe('がぎ');
  });

  it('drops apostrophes rather than turning them into separators', () => {
    expect(slugify("Don't Stop")).toBe('dont-stop');
  });

  it('collapses every other run of non-alphanumerics into one dash', () => {
    expect(slugify('Hello  ---  World!!')).toBe('hello-world');
  });

  it('caps the length and never ends on a dash or half a surrogate pair', () => {
    const long = slugify('a'.repeat(80));
    expect(long).toHaveLength(60);
    expect(slugify('x'.repeat(59) + ' y')).not.toMatch(/-$/);
    // A 60-char cut landing mid-pair would make encodeURIComponent throw.
    expect(() => encodeURIComponent(slugify('😀'.repeat(40)))).not.toThrow();
  });
});

describe('projectPath', () => {
  const project = { publicId: 'vEq0VaYgaM', slug: 'drake-feat-rihanna-song' };

  it('builds the one canonical shape', () => {
    expect(projectPath(project, 'alice')).toBe('/alice/projects/drake-feat-rihanna-song-vEq0VaYgaM');
    expect(projectEditPath(project, 'alice')).toBe('/alice/projects/drake-feat-rihanna-song-vEq0VaYgaM/edit');
  });

  it('reads the owner off the project when not passed one', () => {
    expect(projectPath({ ...project, user: { accountName: 'bob' } })).toBe(
      '/bob/projects/drake-feat-rihanna-song-vEq0VaYgaM',
    );
  });

  it('returns null without an owner, rather than a half-built path', () => {
    expect(projectPath(project)).toBeNull();
    expect(projectEditPath(project)).toBeNull();
  });

  it('derives the slug when the server did not send one', () => {
    expect(projectPath({ publicId: 'vEq0VaYgaM', metadata: { songArtist: 'Drake', songName: 'Song' } }, 'alice'))
      .toBe('/alice/projects/drake-song-vEq0VaYgaM');
  });

  it('still addresses a project whose name slugifies to nothing', () => {
    expect(projectPath({ publicId: 'vEq0VaYgaM', title: '!!!' }, 'alice')).toBe('/alice/projects/vEq0VaYgaM');
  });
});

describe('publicIdFromSlugId', () => {
  it('takes the id off the tail, not by splitting on dashes', () => {
    // The nanoid alphabet contains '-', so the id itself can hold one.
    expect(publicIdFromSlugId('a-song-ab-de_1XyZ')).toBe('ab-de_1XyZ');
    expect(publicIdFromSlugId('vEq0VaYgaM')).toBe('vEq0VaYgaM');
  });

  it('rejects anything that cannot hold an id', () => {
    expect(publicIdFromSlugId('short')).toBeNull();
    expect(publicIdFromSlugId(undefined)).toBeNull();
    expect(publicIdFromSlugId('a-song-$$$$$$$$$$')).toBeNull();
  });
});

// The router, the layout and the header all branch on these, so a false
// positive on /project/new or /project/local would mount the wrong shell.
describe('route-shape predicates', () => {
  it('matches the canonical shapes and nothing else', () => {
    expect(isProjectViewPath('/ada/projects/song-name-V1StGXR8_Z')).toBe(true);
    expect(isProjectViewPath('/ada/projects/song-name-V1StGXR8_Z/edit')).toBe(false);
    expect(isEditorPath('/ada/projects/song-name-V1StGXR8_Z/edit')).toBe(true);
    expect(isEditorPath('/ada/projects/song-name-V1StGXR8_Z')).toBe(false);
    expect(isProjectPath('/ada/projects/x-V1StGXR8_Z/fork')).toBe(true);
    expect(isProjectPath('/ada/lists/abc')).toBe(false);
  });

  it('treats the local draft as the editor but never as a project identity', () => {
    expect(isEditorPath('/project/local')).toBe(true);
    expect(isProjectPath('/project/local')).toBe(false);
  });

  it('never matches the identity-free action routes', () => {
    for (const p of ['/project/new', '/project/local', '/ada', '/profile/ada']) {
      expect(isProjectViewPath(p)).toBe(false);
      expect(isProjectPath(p)).toBe(false);
    }
    expect(isEditorPath('/project/new')).toBe(false);
  });
});
