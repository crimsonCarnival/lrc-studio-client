/**
 * API barrel — backward-compatible re-exports.
 *
 * All domain-specific API logic now lives in src/services/*.service.js.
 * This file re-exports everything under the original named export shapes
 * so existing imports like `import { auth, projects } from '@/app/api'` keep working.
 *
 * New code should import directly from the service files:
 *   import { authService } from '@/features/auth/services/auth.service'
 */
export { setAccessToken, getAccessToken, clearAccessToken, request, setAuthFlag } from './api.client.js';

import { authService } from '@/features/auth/services/auth.service.js';
import { settingsService } from '@/features/settings/services/settings.service.js';
import { projectsService } from '@/features/projects/services/projects.service.js';
import { lyricsService, editorService } from '@/features/editor/services/lyrics.service';
import { uploadsService } from '@/features/projects/services/uploads.service.js';
import { spotifyService } from '@/features/player/services/spotify.service.js';
import { googleService } from '@/features/auth/services/google.service.js';
import { adminService } from '@/features/admin/services/admin.service.js';
import { request } from './api.client.js';

// Original named exports (object-style, backward compatible)
export const auth = authService;
export const settings = settingsService;
export const projects = projectsService;
export const lyrics = lyricsService;
export const editor = editorService;
export const uploads = uploadsService;
export const spotify = spotifyService;
export const google = googleService;
export const admin = adminService;

export const api = {
  auth,
  settings,
  projects,
  lyrics,
  editor,
  uploads,
  spotify,
  google,
  admin,
  getHealth() { return request('/health'); },
};
