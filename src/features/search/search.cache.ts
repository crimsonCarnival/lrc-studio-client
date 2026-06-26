import { LRUCache, Trie } from '@crimson-carnival/ds-js';
import type { FollowUser } from '@/types';

function normalizeQuery(q: string): string {
  return q.toLowerCase().trim();
}

// LRU: 50 most-recent queries
const resultCache = new LRUCache<string, FollowUser[]>(50);

// Trie: prefix index of all known usernames/displayNames
const suggestionTrie = new Trie();

export function getCachedResults(query: string): FollowUser[] | undefined {
  return resultCache.get(normalizeQuery(query));
}

export function cacheResults(query: string, results: FollowUser[]): void {
  resultCache.put(normalizeQuery(query), results);
  for (const user of results) {
    if (user.accountName) suggestionTrie.insert(user.accountName.toLowerCase());
    if (user.displayName) suggestionTrie.insert(user.displayName.toLowerCase());
  }
}

export function getSuggestions(prefix: string): string[] {
  if (!prefix || prefix.length < 1) return [];
  return suggestionTrie.wordsWithPrefix(normalizeQuery(prefix)).slice(0, 8);
}
