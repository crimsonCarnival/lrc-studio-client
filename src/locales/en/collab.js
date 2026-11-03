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
};
