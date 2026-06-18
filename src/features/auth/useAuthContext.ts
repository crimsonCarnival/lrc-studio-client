import { useAuthContext as useAuthContextRaw } from './AuthContext.jsx';
import type { AuthState } from './hooks/useAuth';

// AuthContext.jsx is still untyped (parked); assert the known context shape so
// consumers get real types for user/logout/etc.
export function useAuthContext(): AuthState {
  return useAuthContextRaw() as AuthState;
}
