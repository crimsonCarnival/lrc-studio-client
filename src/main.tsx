import { StrictMode, lazy, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import { setAppNavigate } from '@/app/navigation';
import { accessFor } from '@/app/route-access';
import { isAdminHost, wwwHostUrl, redirectOffMobileHostIfNeeded, redirectToMobileHostIfNeeded } from '@/shared/utils/host';
import { isStaff } from '@/features/auth/permissions';

// Auto-reload when a new deployment invalidates lazy-loaded chunks
// window.addEventListener('vite:preloadError', () => {
// window.location.reload();
// });
import { Toaster } from 'react-hot-toast'
import { AppToast } from '@ui/app-toast'

import './index.css';
import { i18nReady } from '@/app/i18n';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import App from '@/app/App'
import ErrorBoundary from '@shared/ui/ErrorBoundary'
import { SpeedInsights } from '@vercel/speed-insights/react'

// Bridges react-router navigation to code outside the Router tree (toasts).
// eslint-disable-next-line react-refresh/only-export-components
function NavigationBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    setAppNavigate(navigate);
    return () => setAppNavigate(null);
  }, [navigate]);
  return null;
}

// eslint-disable-next-line react-refresh/only-export-components
function LanguageSync() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language || 'en';
  }, [i18n.language]);
  return null;
}
import { AuthProvider, useAuthContext } from '@/features/auth/AuthContext'
import { LoadingSpinner } from '@ui/LoadingSpinner'
import { AppLoadingScreen } from '@ui/AppLoadingScreen'
import { AppProviders } from './app/AppProviders';
import { useSettings } from '@/features/settings/useSettings';
import { RecaptchaGate, RecaptchaRouteArmer } from '@/app/RecaptchaGate';
import { gqlRequest } from '@/app/graphql.client.js';
import { projectPath } from '@/features/projects/project-path';

declare global {
  interface Window {
    __reactRoot?: ReturnType<typeof createRoot>;
  }
}

type SharedProject = {
  publicId?: string;
  slug?: string | null;
  user?: { accountName?: string | null } | null;
};

// Enough to build the canonical, owner-scoped project path: a share token knows
// the project, but the URL it redirects to needs the owner's account name.
const GET_SHARE_PROJECT_ID = /* GraphQL */ `
  query GetShareProjectId($id: ID!) {
    getShare(id: $id) { publicId slug user { accountName } }
  }
`;

// eslint-disable-next-line react-refresh/only-export-components
const AuthPage = lazy(() => import('@features/auth/AuthPage'));
// eslint-disable-next-line react-refresh/only-export-components
const ResetPasswordPage = lazy(() => import('@features/auth/ResetPasswordPage'));
// eslint-disable-next-line react-refresh/only-export-components
const ChangePasswordPage = lazy(() => import('@features/auth/ChangePasswordPage'));

// Resolves a share token to the project's canonical, owner-scoped path.
// eslint-disable-next-line react-refresh/only-export-components
function SharedProjectRoute() {
  const { id } = useParams();
  const location = useLocation();
  const { t } = useTranslation();
  const [path, setPath] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    gqlRequest(GET_SHARE_PROJECT_ID, { id })
      .then((data: { getShare?: SharedProject | null } | null) => {
        const project = data?.getShare;
        // No owner means no canonical URL exists for the project, so there is
        // nowhere to send the viewer — the same dead end as a bad token.
        const dest = project?.publicId
          ? projectPath({ publicId: project.publicId, slug: project.slug, user: project.user })
          : null;
        if (dest) setPath(dest);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [id]);

  if (failed) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-sm text-zinc-400">{t('common.shareLinkNotFound')}</p>
    </div>
  );
  if (!path) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingSpinner size="sm" />
    </div>
  );
  // Carry the query string and hash across the redirect. Share links built by
  // the share modal append `?s=<seconds>`, and dropping the search here is what
  // made every custom-time share link land at 0:00.
  return <Navigate to={`${path}${location.search}${location.hash}`} replace />;
}

// Protected Route Wrapper
// eslint-disable-next-line react-refresh/only-export-components
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return <AppLoadingScreen />;
  }

  // admin.lrcstudio.app serves only the dashboard, at `/` (also `/home` and
  // `/dashboard`). Any other page belongs on www. Convenience only — access is
  // still checked below and every admin action is re-authorised server-side.
  const onAdminHost = isAdminHost();
  const adminPaths = ['/', '/home', '/dashboard'];
  if (onAdminHost && !adminPaths.includes(location.pathname) && !location.pathname.startsWith('/auth')) {
    window.location.replace(wwwHostUrl(location.pathname + location.search + location.hash));
    return <AppLoadingScreen />;
  }

  // Logged-in users landing on root should go to the home dashboard.
  if (user && !onAdminHost && location.pathname === '/') {
    return <Navigate to="/home" replace />;
  }

  // Default-deny access control. Source of truth: app/route-access.ts.
  // `auth` means any session (including guest sessions, which some pages such
  // as Settings intentionally support); only fully-anonymous visitors are
  // blocked. `admin` additionally requires staff permissions below.
  const access = onAdminHost ? 'admin' : accessFor(location.pathname);

  if (access !== 'public' && !user) {
    let redirectUrl = location.pathname + location.search;
    if (location.pathname === '/change-password') {
      redirectUrl = '/home';
    }
    return <Navigate to={`/auth/signin?redirect=${encodeURIComponent(redirectUrl)}`} replace />;
  }

  // Staff-only routes: an authenticated non-staff user is bounced home.
  if (access === 'admin' && !isStaff(user?.permissions)) {
    if (onAdminHost) {
      window.location.replace(wwwHostUrl('/home'));
      return <AppLoadingScreen />;
    }
    return <Navigate to="/home" replace />;
  }

  return children;
}

// eslint-disable-next-line react-refresh/only-export-components
function AuthRedirect({ defaultTo = '/home' }: { defaultTo?: string }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect') || defaultTo;
  return <Navigate to={redirect} replace />;
}

// eslint-disable-next-line react-refresh/only-export-components
function RootRoutes() {
  const { user, loading, heldLoginResult } = useAuthContext();

  if (loading) {
    return <AppLoadingScreen />;
  }

  // Keep AuthPage mounted while heldLoginResult is set so the save-login prompt can show.
  const showAuthPage = !user || heldLoginResult;

  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <Routes>
        <Route path="/share/:id" element={<SharedProjectRoute />} />

        {/* Legacy redirects */}
        <Route path="/login" element={<Navigate to="/auth/signin" replace />} />
        <Route path="/register" element={<Navigate to="/auth/signup" replace />} />

        {/* Auth routes */}
        <Route path="/auth" element={showAuthPage ? <AuthPage /> : <AuthRedirect />} />
        <Route path="/auth/:mode" element={showAuthPage ? <AuthPage /> : <AuthRedirect />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/change-password" element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        } />

        {/* Protected app routes - App handles nested routing inside itself */}
        <Route path="/*" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
function AppToaster() {
  const { settings } = useSettings();
  const position = settings.interface?.toastPosition || 'bottom-right';

  return (
    <Toaster
      position={position}
      toastOptions={{
        success: { duration: 2000 },
        error: { duration: 4000 },
      }}
    >
      {(item) => <AppToast item={item} />}
    </Toaster>
  );
}

const rootElement = document.getElementById('root');

// Runs before the first render so a desktop visitor never sees a frame of the
// phone layout before being sent to the canonical host.
redirectOffMobileHostIfNeeded();
redirectToMobileHostIfNeeded();

// Keep icons blank until the Material Symbols font is usable, so nothing flashes in
// their place. The preload now comes from index.html (injected at build time by the
// preloadIconFont plugin in vite.config.js) rather than being appended here — appending
// it from the entry chunk meant it could not start until that chunk had parsed, which is
// later than the stylesheet would have requested the font anyway.
{
  const root = document.documentElement;
  root.classList.add('icons-loading');
  const ready = () => root.classList.remove('icons-loading');
  if (document.fonts?.load) {
    // Probe a real glyph: the font is subset by codepoint, so 'a' is no longer in it.
    document.fonts.load('24px "Material Symbols Outlined"', '\u{e88a}').then(ready, ready);
    setTimeout(ready, 3000);
  } else {
    ready();
  }
}

// Only create root once to prevent HMR issues
if (!window.__reactRoot) {
  window.__reactRoot = createRoot(rootElement!);
}

// i18n resources for the active language are now a dynamic import (see app/i18n.ts) instead
// of a synchronous object, so the previous guarantee — that i18n is ready before the first
// render — needs an explicit await here. The resolved promise is the same point at which
// init() used to finish synchronously; this changes *when* that happens, not *what* the
// first render sees.
i18nReady.then(() => {
  window.__reactRoot!.render(
    <StrictMode>
      <ErrorBoundary>
        <RecaptchaGate>
          <AuthProvider>
            <LanguageSync />
            <SpeedInsights />
            <AppProviders>
              <BrowserRouter>
                <RecaptchaRouteArmer />
                <NavigationBridge />
                <RootRoutes />
              </BrowserRouter>
              <AppToaster />
            </AppProviders>
          </AuthProvider>
        </RecaptchaGate>
      </ErrorBoundary>
    </StrictMode>,
  );
});
