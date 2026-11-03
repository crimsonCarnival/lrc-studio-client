export default {
  // Shown on /session/:publicId once the connection stops for good.
  session: {
    endedTitle: 'This session has ended',
    endedBody: 'The owner closed the live session. Everything edited in it was saved to the project.',
    goHome: 'Go to home',
    // The first connection never got through (server unreachable, or the app could not load the session code).
    offlineTitle: 'Can’t reach the session',
    offlineBody: 'Check your connection. It keeps trying in the background, or you can try again now.',
    retry: 'Try again',
  },
  // Line locks: one participant edits or syncs a line at a time.
  locks: {
    denied: '{{name}} is working on this line',
    deniedGeneric: 'You can’t edit this line right now',
    offline: 'You’re offline — that change wasn’t applied',
    badge: 'Editing: {{name}}',
    deleteLocked: 'This line is being edited by {{name}}',
    deleteGone: 'Someone already removed that line',
    replaceLocked: '{{name}} is editing a line. Wait for them to finish before replacing all lyrics.',
  },
  // Presence: who else is in the session and where they are.
  presence: {
    participants: 'Participants',
    you: 'You',
    online: 'Online',
    offline: 'Offline',
    role: { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' },
    // Which layout a participant has open.
    view: { editor: 'Editing', 'words-focus': 'Word timing', preview: 'Previewing', mobile: 'On mobile' },
    onLine: '{{name}} is on this line',
    playhead: '{{name}}’s position, click to jump there',
    pointer: '{{name}}’s pointer',
  },
};
