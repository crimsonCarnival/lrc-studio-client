export default {
  title: 'Feed',
  loadMore: 'Load more',
  error: 'Failed to load feed. Try again later.',
  empty: {
    title: [
      'Nothing here yet.',
      'Looks pretty quiet.',
      'Your feed is empty.',
      'No activity to show.',
    ],
    cta: [
      'Follow some users to see their activity.',
      'Start following creators to fill your feed.',
      "Find someone to follow and see what they're making.",
      'Follow a few users and their projects will appear here.',
    ],
  },
  untitled: 'Untitled project',
  you: 'You',
  target: {
    mine: 'your project',
    ownMine: 'your own project',
    own: 'their own project',
    ofPrefix: '',
    ofSuffix: "'s project",
  },
  action: {
    project_published: [
      'published a new project',
      'just dropped a project',
      'released a new sync',
      'published',
    ],
    project_starred: [
      'starred',
      'liked',
      'gave a star to',
    ],
    project_forked: [
      'forked',
      'made a copy of',
      'branched off from',
    ],
    project_shared: [
      'shared',
      'reposted',
      'passed along',
    ],
    playlist_created: [
      'created a playlist',
      'made a new playlist',
      'dropped a playlist',
    ],
    user_followed: [
      'is now following',
      'started following',
      'followed',
    ],
  },
  // The reader did it themselves.
  selfAction: {
    project_published: ['published a new project', 'just dropped a project', 'released a new sync', 'published'],
    project_starred: ['starred', 'liked', 'gave a star to'],
    project_forked: ['forked', 'made a copy of', 'branched off from'],
    project_shared: ['shared', 'reposted', 'passed along'],
    playlist_created: ['created a playlist', 'made a new playlist', 'dropped a playlist'],
    user_followed: ['are now following', 'started following', 'followed'],
  },
  // It was done to the reader: the person followed is "you", so the verb carries it.
  toYouAction: {
    user_followed: ['is now following you', 'started following you', 'followed you'],
  },
};
