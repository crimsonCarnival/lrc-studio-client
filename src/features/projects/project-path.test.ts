import { describe, expect, it } from 'vitest';
import { editorPath, hasProjectIdentity, projectDisplayName, isProjectEditorPath, isProjectViewPath, parseSlugId, projectPath, slugify } from './project-path';

describe('slugify', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(slugify("Beyoncé — Don't Hurt Yourself!")).toBe('beyonce-dont-hurt-yourself');
    expect(slugify('Canción del Mariachi')).toBe('cancion-del-mariachi');
  });
  it('keeps non-Latin letters', () => {
    expect(slugify('米津玄師 ありがとう')).toBe('米津玄師-ありがとう');
    expect(slugify('が')).toBe('が');
  });
  it('is empty when nothing usable remains', () => {
    expect(slugify('!!!')).toBe('');
  });
  it('caps length without a trailing dash', () => {
    const slug = slugify('word '.repeat(40));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('projectDisplayName', () => {
  it('uses the song and artist the user typed', () => {
    expect(projectDisplayName({ title: 'my-file.mp3', metadata: { songName: 'Creep', songArtist: 'Radiohead' } })).toBe('Creep – Radiohead');
    expect(projectDisplayName({ metadata: { songName: 'Creep', songArtist: 'A feat. B' } })).toBe('Creep – A feat. B');
  });
  it('falls back to what exists, then the project name', () => {
    expect(projectDisplayName({ title: 'x', metadata: { songName: 'Creep' } })).toBe('Creep');
    expect(projectDisplayName({ title: 'x', metadata: { songArtist: 'Radiohead' } })).toBe('Radiohead');
    expect(projectDisplayName({ title: ' My Song ' })).toBe('My Song');
    expect(projectDisplayName({})).toBe('');
  });
});

describe('projectPath / parseSlugId', () => {
  const id = 'k3x9a2c7qm';
  const project = { publicId: id, user: { accountName: '32blunts' }, metadata: { songArtist: 'Radiohead', songName: 'Creep' } };

  it('builds /:accountName/projects/:slug-:publicId', () => {
    expect(projectPath(project)).toBe(`/32blunts/projects/radiohead-creep-${id}`);
  });
  it('falls back to the title, then to the bare id', () => {
    expect(projectPath({ publicId: id, accountName: 'a', title: 'My Song' })).toBe(`/a/projects/my-song-${id}`);
    expect(projectPath({ publicId: id, accountName: 'a' })).toBe(`/a/projects/${id}`);
  });
  it('prefers the server-stored slug', () => {
    expect(projectPath({ ...project, slug: 'stored-slug' })).toBe(`/32blunts/projects/stored-slug-${id}`);
  });
  it('requires a title, song name or artist that survives slugging', () => {
    expect(hasProjectIdentity({})).toBe(false);
    expect(hasProjectIdentity({ title: '  ', metadata: { songName: '', songArtist: '' } })).toBe(false);
    expect(hasProjectIdentity({ title: '!!!' })).toBe(false);
    expect(hasProjectIdentity({ title: 'x' })).toBe(true);
    expect(hasProjectIdentity({ metadata: { songArtist: 'Radiohead' } })).toBe(true);
    expect(hasProjectIdentity({ metadata: { songName: 'Creep' } })).toBe(true);
  });
  it('uses the legacy path when the owner is unknown', () => {
    expect(projectPath({ publicId: id })).toBe(`/project/${id}`);
  });
  it('round-trips, including ids that contain - and _', () => {
    for (const pid of [id, '-abc_def-g', '_-_-_-_-_a']) {
      expect(parseSlugId(`radiohead-creep-${pid}`)).toBe(pid);
      expect(parseSlugId(pid)).toBe(pid);
    }
  });
  it('builds editor paths, legacy when the owner is unknown', () => {
    expect(editorPath(project)).toBe(`/32blunts/projects/radiohead-creep-${id}/edit`);
    expect(editorPath({ publicId: id })).toBe(`/project/${id}/edit`);
    expect(isProjectEditorPath(editorPath(project))).toBe(true);
    expect(isProjectViewPath(editorPath(project))).toBe(false);
  });
  it('recognises the view path', () => {
    expect(isProjectViewPath(`/32blunts/projects/radiohead-creep-${id}`)).toBe(true);
    expect(isProjectViewPath('/project/abc')).toBe(false);
    expect(isProjectViewPath('/profile/32blunts')).toBe(false);
  });
});
