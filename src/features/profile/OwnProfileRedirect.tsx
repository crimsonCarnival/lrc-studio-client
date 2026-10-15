import { Navigate } from 'react-router-dom';
import { LogoLoader } from '@ui/LogoLoader';
import { useAuthContext } from '@/features/auth/useAuthContext';

/**
 * `/profile` with no account name: send a signed-in user to their own profile and
 * everyone else to sign in (coming back to `/profile` afterwards). Without this
 * route the bare path matched nothing and landed on the 404 page.
 */
export default function OwnProfileRedirect() {
  const { user, loading } = useAuthContext();
  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>;
  }
  if (user?.accountName) return <Navigate to={`/profile/${user.accountName}`} replace />;
  return <Navigate to={`/auth/signin?redirect=${encodeURIComponent('/profile')}`} replace />;
}
