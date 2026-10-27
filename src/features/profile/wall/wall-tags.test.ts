import { describe, it, expect } from 'vitest';
import { findTrigger, activeTrigger, serializeTags, tagRanges, bodySegments, deserializeBody, userToken, projectToken } from './wall-tags';

describe('findTrigger', () => {
  it('finds a person being typed', () => {
    expect(findTrigger('hi @sa')).toEqual({ kind: 'user', query: 'sa', start: 3 });
    expect(findTrigger('@')).toEqual({ kind: 'user', query: '', start: 0 });
  });

  it('treats names with : and - as names, and only / as the project trigger', () => {
    expect(findTrigger('@my-name')).toMatchObject({ kind: 'user', query: 'my-name' });
    expect(findTrigger('@my:name')).toMatchObject({ kind: 'user', query: 'my:name' });
    expect(findTrigger('see @sam/Blue so')).toEqual({ kind: 'project', owner: 'sam', query: 'Blue so', start: 4 });
  });

  it('ignores an @ inside a word, like an email address', () => {
    expect(findTrigger('mail me at a@b')).toBeNull();
  });
});

describe('activeTrigger', () => {
  const sam = { display: '@sam', token: userToken('u1') };
  const song = { display: '@sam/Blue Song', token: projectToken('p1') };

  it("opens the owner's projects after a picked person tag and a slash", () => {
    expect(activeTrigger('@sam/', 5, [sam], null)).toMatchObject({ kind: 'project', owner: 'sam' });
  });

  it('stays closed right after a person tag was picked, and after a picked project tag', () => {
    expect(activeTrigger('@sam', 4, [sam], null)).toBeNull();
    expect(activeTrigger('@sam/Blue Song more', 19, [song], null)).toBeNull();
  });

  it('stays closed for the tag the user dismissed', () => {
    expect(activeTrigger('hi @sa', 6, [], 3)).toBeNull();
  });
});

describe('serializeTags', () => {
  const sam = { display: '@sam', token: userToken('u1') };
  const song = { display: '@sam/Blue Song', token: projectToken('p1') };

  it('swaps tag text for tokens, longest first', () => {
    expect(serializeTags('@sam check @sam/Blue Song', [sam, song])).toBe(`${userToken('u1')} check ${projectToken('p1')}`);
  });

  it('leaves a tag alone once it runs into more name characters', () => {
    expect(serializeTags('@samuel hi', [sam])).toBe('@samuel hi');
  });
});

describe('tagRanges', () => {
  it('finds each tag once, longest first, in text order', () => {
    const sam = { display: '@sam', token: userToken('u1') };
    const song = { display: '@sam/Blue Song', token: projectToken('p1') };
    const ranges = tagRanges('@sam/Blue Song by @sam', [sam, song]);
    expect(ranges.map((r) => [r.start, r.end, r.kind])).toEqual([[0, 14, 'project'], [18, 22, 'user']]);
  });
});

describe('deserializeBody', () => {
  it('turns tokens back into editable text that serializes to the same body', () => {
    const mention = { id: 'u1', accountName: 'sam', displayName: null };
    const ref = { publicId: 'p1', title: 'Blue Song', slug: 'blue-song', coverImage: null, ownerAccountName: 'sam' };
    const body = `hey ${userToken('u1')} see ${projectToken('p1')}`;
    const { text, entities } = deserializeBody(body, [mention], [ref]);
    expect(text).toBe('hey @sam see @sam/Blue Song');
    expect(serializeTags(text, entities)).toBe(body);
  });
});

describe('bodySegments', () => {
  it('splits text, resolved tags and unresolved tags', () => {
    const mention = { id: 'u1', accountName: 'sam', displayName: null };
    const segments = bodySegments(`hey ${userToken('u1')} ${projectToken('gone')}!`, [mention], []);
    expect(segments).toEqual([
      { kind: 'text', text: 'hey ' },
      { kind: 'user', mention },
      { kind: 'text', text: ' ' },
      { kind: 'unresolved', tag: 'project' },
      { kind: 'text', text: '!' },
    ]);
  });
});
