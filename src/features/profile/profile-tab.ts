const TABS = ['projects', 'playlists', 'artists', 'shared', 'activity'] as const;
export type ProfileTab = (typeof TABS)[number];

/** The tab named by `?tab=`, or Projects when it is absent, unknown or not shown to this viewer. */
export function tabFromParams(params: URLSearchParams, showArtistsTab: boolean): ProfileTab {
  const tab = TABS.find((t) => t === params.get('tab'));
  if (!tab || (tab === 'artists' && !showArtistsTab)) return 'projects';
  return tab;
}

/** A copy of `params` pointing at `tab`; the default tab leaves no param. Other params (`view`) are kept. */
export function withTab(params: URLSearchParams, tab: ProfileTab): URLSearchParams {
  const next = new URLSearchParams(params);
  if (tab === 'projects') next.delete('tab');
  else next.set('tab', tab);
  return next;
}
