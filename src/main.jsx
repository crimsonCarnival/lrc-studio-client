import { StrictMode, lazy, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';

// Auto-reload when a new deployment invalidates lazy-loaded chunks
// window.addEventListener('vite:preloadError', () => {
// window.location.reload();
// });
import { Toaster } from 'react-hot-toast'
import { TooltipProvider } from '@ui/tooltip'
import './index.css';
import '@/app/i18n.js';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import App from '@/app/App.jsx'
import ErrorBoundary from '@shared/ui/ErrorBoundary'
import { SpeedInsights } from '@vercel/speed-insights/react'

// eslint-disable-next-line react-refresh/only-export-components
function LanguageSync() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language || 'en';
  }, [i18n.language]);
  return null;
}
import { AuthProvider, useAuthContext } from '@/features/auth/AuthContext.jsx'
import { Spinner } from '@ui/skeleton'
import { AppProviders } from './app/AppProviders';
import { useSettings } from '@/features/settings/useSettings';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { gqlRequest } from '@/app/graphql.client.js';

const GET_SHARE_PROJECT_ID = `
  query GetShareProjectId($id: ID!) {
    getShare(id: $id) { projectId }
  }
`;

// eslint-disable-next-line react-refresh/only-export-components
const AuthPage = lazy(() => import('@features/auth/AuthPage.jsx'));
// eslint-disable-next-line react-refresh/only-export-components
const ResetPasswordPage = lazy(() => import('@features/auth/ResetPasswordPage.jsx'));
// eslint-disable-next-line react-refresh/only-export-components
const ChangePasswordPage = lazy(() => import('@features/auth/ChangePasswordPage.jsx'));

// Resolves a share token to a projectId and redirects to /project/:projectId
// eslint-disable-next-line react-refresh/only-export-components
function SharedProjectRoute() {
  const { id } = useParams();
  const [projectId, setProjectId] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    gqlRequest(GET_SHARE_PROJECT_ID, { id })
      .then(data => {
        const pid = data?.getShare?.projectId;
        if (pid) setProjectId(pid);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [id]);

  if (failed) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-sm text-zinc-400">Share link not found.</p>
    </div>
  );
  if (!projectId) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  return <Navigate to={`/project/${projectId}`} replace />;
}

// Protected Route Wrapper
// eslint-disable-next-line react-refresh/only-export-components
function ProtectedRoute({ children }) {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size={24} className="text-primary" />
      </div>
    );
  }

  // Logged-in users landing on root should go to the home dashboard.
  if (user && location.pathname === '/') {
    return <Navigate to="/home" replace />;
  }

  // Guests can access certain paths without signing in.
  const isGuestAllowed =
    ['/', '/project/new', '/project/local'].includes(location.pathname) ||
    /^\/project\/[^/]+$/.test(location.pathname) ||          // public project view
    /^\/[a-z0-9_.:-]+$/.test(location.pathname) ||           // public profile
    /^\/[a-z0-9_.:-]+\/lists\/[^/]+$/.test(location.pathname); // public list page
  if (!user && !isGuestAllowed) {
    let redirectUrl = location.pathname + location.search;
    if (location.pathname === '/change-password') {
      redirectUrl = '/home';
    }
    return <Navigate to={`/auth/signin?redirect=${encodeURIComponent(redirectUrl)}`} replace />;
  }

  return children;
}

// eslint-disable-next-line react-refresh/only-export-components
function AuthRedirect({ defaultTo = '/home' }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect') || defaultTo;
  return <Navigate to={redirect} replace />;
}

// eslint-disable-next-line react-refresh/only-export-components
function RootRoutes() {
  const { user, loading, heldLoginResult } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size={24} className="text-primary" />
      </div>
    );
  }

  // Keep AuthPage mounted while heldLoginResult is set so the save-login prompt can show.
  const showAuthPage = !user || heldLoginResult;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size={24} className="text-primary" />
      </div>
    }>
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
        style: {
          background: '#18181b',
          color: '#f4f4f5',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '0.75rem',
          fontSize: '0.8125rem',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '0.625rem 1rem',
        },
        success: {
          iconTheme: { primary: '#1DB954', secondary: '#09090b' },
          duration: 2000,
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#09090b' },
          duration: 4000,
        },
      }}
    />
  );
}

const rootElement = document.getElementById('root');

// Only create root once to prevent HMR issues
if (!window.__reactRoot) {
  window.__reactRoot = createRoot(rootElement);
}

window.__reactRoot.render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_RECAPTCHA_KEY}>
        <AuthProvider>
          <LanguageSync />
          <SpeedInsights />
          <AppProviders>
            <BrowserRouter>
              <RootRoutes />
            </BrowserRouter>
            <AppToaster />
          </AppProviders>
        </AuthProvider>
      </GoogleReCaptchaProvider>
    </ErrorBoundary>
  </StrictMode>,
);
