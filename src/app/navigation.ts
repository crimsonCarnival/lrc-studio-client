import type { NavigateFunction } from 'react-router-dom';

let _navigate: NavigateFunction | null = null;

// Registered by <NavigationBridge> from inside the Router tree.
export function setAppNavigate(fn: NavigateFunction | null): void {
  _navigate = fn;
}

// Navigate from outside the Router tree — e.g. toasts, which react-hot-toast
// renders from <AppToaster>, mounted above <BrowserRouter>. No-op until the
// bridge registers (early in app startup), so calls before then are dropped.
export function appNavigate(to: string): void {
  _navigate?.(to);
}
