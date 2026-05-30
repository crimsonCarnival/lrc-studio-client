import type app from './en/app.js';
import type player from './en/player.js';
import type editor from './en/editor.js';
import type preview from './en/preview.js';
import type exportLocale from './en/export.js';
import type project from './en/project.js';
import type auth from './en/auth.js';
import type confirm from './en/confirm.js';
import type importLocale from './en/import.js';
import type share from './en/share.js';
import type network from './en/network.js';
import type library from './en/library.js';
import type home from './en/home.js';
import type common from './en/common.js';
import type shortcuts from './en/shortcuts.js';
import type settings from './en/settings.js';
import type setup from './en/setup.js';
import type uploads from './en/uploads.js';
import type spotify from './en/spotify.js';
import type lyricsSearch from './en/lyricsSearch.js';
import type landing from './en/landing.js';
import type admin from './en/admin.js';
import type profile from './en/profile.js';
import type errorLocale from './en/error.js';
import type notifications from './en/notifications.js';
import type playlists from './en/playlists.js';
import type feed from './en/feed.js';
import type search from './en/search.js';
import type projectView from './en/projectView.js';
import type explore from './en/explore.js';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: {
        app: typeof app;
        player: typeof player;
        editor: typeof editor;
        preview: typeof preview;
        export: typeof exportLocale;
        project: typeof project;
        auth: typeof auth;
        confirm: typeof confirm;
        import: typeof importLocale;
        share: typeof share;
        network: typeof network;
        library: typeof library;
        home: typeof home;
        common: typeof common;
        shortcuts: typeof shortcuts;
        settings: typeof settings;
        setup: typeof setup;
        uploads: typeof uploads;
        spotify: typeof spotify;
        lyricsSearch: typeof lyricsSearch;
        landing: typeof landing;
        admin: typeof admin;
        profile: typeof profile;
        error: typeof errorLocale;
        notifications: typeof notifications;
        playlists: typeof playlists;
        feed: typeof feed;
        search: typeof search;
        projectView: typeof projectView;
        explore: typeof explore;
      };
    };
  }
}
