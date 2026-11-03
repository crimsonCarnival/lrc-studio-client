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
    badge: 'Editing: {{name}}',
    deleteLocked: 'This line is being edited by {{name}}',
  },
};
