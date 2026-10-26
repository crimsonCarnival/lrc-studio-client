import { describe, it, expect } from 'vitest';
import { findTrigger, serializeTags, bodySegments, userToken, projectToken } from './wall-tags';

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
