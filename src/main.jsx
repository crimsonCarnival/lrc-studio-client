import { StrictMode, lazy, Suspense } from 'react'
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

// eslint-disable-next-line react-refresh/only-export-components
const AuthPage = lazy(() => import('@features/auth/AuthPage.jsx'));
// eslint-disable-next-line react-refresh/only-export-components
const SharedProjectViewer = lazy(() => import('@features/sharing/components/SharedProjectViewer.jsx'));
// eslint-disable-next-line react-refresh/only-export-components
const ResetPasswordPage = lazy(() => import('@features/auth/ResetPasswordPage.jsx'));
// eslint-disable-next-line react-refresh/only-export-components
const ChangePasswordPage = lazy(() => import('@features/auth/ChangePasswordPage.jsx'));

// Wrapper for SharedProjectViewer to get the id param
// eslint-disable-next-line react-refresh/only-export-components
function SharedProjectRoute() {
  const { id } = useParams();
  return <SharedProjectViewer projectId={id} />;
}

// Guest-accessible paths — these work without an account.
const GUEST_ACCESSIBLE_PATHS = ['/', '/project/new', '/project/local'];

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

  // Guests can access the setup / local project page without signing in.
  const isGuestAllowed = GUEST_ACCESSIBLE_PATHS.includes(location.pathname);
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
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size={24} className="text-primary" />
      </div>
    );
  }

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
        <Route path="/auth" element={user ? <AuthRedirect /> : <AuthPage />} />
        <Route path="/auth/:mode" element={user ? <AuthRedirect /> : <AuthPage />} />
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
