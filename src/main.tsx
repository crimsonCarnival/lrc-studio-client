import { StrictMode, lazy, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import { setAppNavigate } from '@/app/navigation';
import { accessFor } from '@/app/route-access';
import { isStaff } from '@/features/auth/permissions';

// Auto-reload when a new deployment invalidates lazy-loaded chunks
// window.addEventListener('vite:preloadError', () => {
// window.location.reload();
// });
import { Toaster } from 'react-hot-toast'
import 'material-symbols/outlined.css';
import './index.css';
import '@/app/i18n';
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
import { Spinner } from '@ui/skeleton'
import { LoadingSpinner } from '@ui/LoadingSpinner'
import { AppProviders } from './app/AppProviders';
import { useSettings } from '@/features/settings/useSettings';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { gqlRequest } from '@/app/graphql.client.js';

declare global {
  interface Window {
    __reactRoot?: ReturnType<typeof createRoot>;
  }
}

const GET_SHARE_PROJECT_ID = /* GraphQL */ `
  query GetShareProjectId($id: ID!) {
    getShare(id: $id) { publicId }
  }
`;

// eslint-disable-next-line react-refresh/only-export-components
const AuthPage = lazy(() => import('@features/auth/AuthPage'));
// eslint-disable-next-line react-refresh/only-export-components
const ResetPasswordPage = lazy(() => import('@features/auth/ResetPasswordPage'));
// eslint-disable-next-line react-refresh/only-export-components
const ChangePasswordPage = lazy(() => import('@features/auth/ChangePasswordPage'));

// Resolves a share token to a publicId and redirects to /project/:publicId
// eslint-disable-next-line react-refresh/only-export-components
function SharedProjectRoute() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [publicId, setpublicId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    gqlRequest(GET_SHARE_PROJECT_ID, { id })
      .then((data: { getShare?: { publicId?: string } } | null) => {
        const pid = data?.getShare?.publicId;
        if (pid) setpublicId(pid);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [id]);

  if (failed) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-sm text-zinc-400">{t('common.shareLinkNotFound')}</p>
    </div>
  );
  if (!publicId) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingSpinner size="sm" />
    </div>
  );
  return <Navigate to={`/project/${publicId}`} replace />;
}

// Protected Route Wrapper
// eslint-disable-next-line react-refresh/only-export-components
function ProtectedRoute({ children }: { children: ReactNode }) {
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

  // Default-deny access control. Source of truth: app/route-access.ts.
  // `auth` means any session (including guest sessions, which some pages such
  // as Settings intentionally support); only fully-anonymous visitors are
  // blocked. `admin` additionally requires staff permissions below.
  const access = accessFor(location.pathname);

  if (access !== 'public' && !user) {
    let redirectUrl = location.pathname + location.search;
    if (location.pathname === '/change-password') {
      redirectUrl = '/home';
    }
    return <Navigate to={`/auth/signin?redirect=${encodeURIComponent(redirectUrl)}`} replace />;
  }

  // Staff-only routes: an authenticated non-staff user is bounced home.
  if (access === 'admin' && !isStaff(user?.permissions)) {
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
  window.__reactRoot = createRoot(rootElement!);
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
              <NavigationBridge />
              <RootRoutes />
            </BrowserRouter>
            <AppToaster />
          </AppProviders>
        </AuthProvider>
      </GoogleReCaptchaProvider>
    </ErrorBoundary>
  </StrictMode>,
);
