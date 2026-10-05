import { Trie } from '@crimson-carnival/ds-js';
import type { FollowUser } from '@/types';

// Prefix index of every username/displayName seen in search results this
// session, for instant local suggestions. The results themselves live in the
// query cache (see useUserSearch).
const suggestionTrie = new Trie();

export function cacheResults(results: FollowUser[]): void {
  for (const user of results) {
    if (user.accountName) suggestionTrie.insert(user.accountName.toLowerCase());
    if (user.displayName) suggestionTrie.insert(user.displayName.toLowerCase());
  }
}

export function getSuggestions(prefix: string): string[] {
  if (!prefix || prefix.length < 1) return [];
  return suggestionTrie.wordsWithPrefix(prefix.toLowerCase().trim()).slice(0, 8);
}
