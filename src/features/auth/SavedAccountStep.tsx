import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { TFunction } from 'i18next';
import { LogIn, Loader2, Plus, X, Fingerprint } from 'lucide-react';
import { auth } from '@/app/api';
import { translateAuthError } from '@/shared/utils/auth-errors';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { AvatarBadge } from './auth-shared';
import { rememberedAccounts } from '@/features/auth/services/remembered-accounts.service';

interface SavedAccount {
  userId: string;
  identifier?: string;
  accountName?: string;
  displayName?: string;
  avatarUrl?: string;
  hasPasskey?: boolean;
}

interface SavedAccountStepProps {
  t: TFunction;
  savedAccounts: SavedAccount[];
  accountsChecked: boolean;
  onProceedToPassword: (data: { identifier?: string; [key: string]: unknown }) => void;
  onGoogleLogin?: (identifier?: string) => void | Promise<void>;
  onAddAccount: () => void;
  onRemoveAccount: (userId: string) => void;
  onPasskeySuccess: () => void;
}

// ─── Account Picker — shown on return visits when remembered accounts exist ──

export default function SavedAccountStep({ t, savedAccounts, accountsChecked, onProceedToPassword, onGoogleLogin, onAddAccount, onRemoveAccount, onPasskeySuccess }: SavedAccountStepProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { loginWithPasskey } = useAuthContext();

  // Default row action: go to password (or OAuth for OAuth-only accounts).
  // Passkey is no longer forced here even when set up — it's an explicit,
  // opt-in button (handlePasskey) so users can always choose password instead.
  const handleLogin = async (account: SavedAccount) => {
    const key = account.userId || account.identifier || '';
    setLoadingKey(key);
    setErrors((prev) => ({ ...prev, [key]: '' }));

    try {
      const identifier = account.identifier || account.accountName || '';
      const result = await auth.checkIdentifier(identifier) as { hasPassword?: boolean; hasGoogle?: boolean };

      // OAuth-only accounts (no password): skip the password step and
      // trigger the appropriate OAuth sign-in directly.
      if (result.hasPassword === false) {
        if (result.hasGoogle && onGoogleLogin) {
          await onGoogleLogin(identifier);
          return;
        }
      }

      onProceedToPassword({ identifier, ...result });
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [key]: translateAuthError(t, err, 'login', account.identifier),
      }));
    } finally {
      setLoadingKey(null);
    }
  };

  // Explicit passkey sign-in for an account that has one set up.
  const handlePasskey = async (e: MouseEvent, account: SavedAccount) => {
    e.stopPropagation();
    const key = account.userId || account.identifier || '';
    setLoadingKey(key);
    setErrors((prev) => ({ ...prev, [key]: '' }));
    try {
      const user = await loginWithPasskey(account.identifier || account.accountName);
      if (user) {
        onPasskeySuccess();
        return;
      }
      // null = user cancelled the WebAuthn prompt — stay on the picker.
      setLoadingKey(null);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [key]: translateAuthError(t, err, 'login', account.identifier),
      }));
      setLoadingKey(null);
    }
  };

  // ── Skeleton — shown while we validate accounts against the server ─────────
  if (!accountsChecked) {
    // Guess how many rows to show from storage so the layout doesn't jump
    const skeletonCount = Math.max(1, Math.min(rememberedAccounts.getAll().length, 3));
    return (
      <div className="animate-fade-in flex flex-col gap-5" aria-hidden="true">
        <div>
          <div className="h-3 w-24 rounded bg-zinc-800 mb-4 animate-pulse" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/30"
              >
                <div className="size-9 rounded-full bg-zinc-700/60 animate-pulse shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 w-28 rounded bg-zinc-700/60 animate-pulse" />
                  <div className="h-2.5 w-20 rounded bg-zinc-800/80 animate-pulse" />
                </div>
                <div className="size-4 rounded bg-zinc-700/40 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          {t('auth.savedAccount.continueAs')}
        </p>

        <div className="flex flex-col gap-2">
          {savedAccounts.map((account) => {
            const key = account.userId || account.identifier || '';
            const displayName = account.displayName || account.accountName || account.identifier || '';
            const isLoading = loadingKey === key;

            return (
              // Outer row: the account card (password/OAuth login) and, when a
              // passkey exists, a visually separate passkey button beside it so
              // the two actions read as distinct.
              <div key={key} className="flex items-stretch gap-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !isLoading && handleLogin(account)}
                  onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && !isLoading && handleLogin(account)}
                  className="group relative flex-1 min-w-0 flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/40 hover:border-zinc-600/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <AvatarBadge
                    username={account.accountName || account.identifier}
                    avatarUrl={account.avatarUrl}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{displayName}</p>
                    {account.accountName && account.accountName.toLowerCase() !== displayName.toLowerCase() && (
                      <p className="text-xs text-zinc-500">@{account.accountName}</p>
                    )}
                    {errors[key] && (
                      <p className="text-xs text-red-400 mt-0.5">{errors[key]}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin text-zinc-500" />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveAccount(account.userId);
                          }}
                          title={t('auth.savedAccount.removeAccount')}
                          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-all"
                        >
                          <X className="size-3.5" />
                        </button>
                        <LogIn className="size-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                      </>
                    )}
                  </div>
                </div>

                {account.hasPasskey && (
                  <button
                    type="button"
                    onClick={(e) => handlePasskey(e, account)}
                    disabled={isLoading}
                    title={t('auth.savedAccount.usePasskey')}
                    aria-label={t('auth.savedAccount.usePasskey')}
                    className="shrink-0 w-[52px] flex items-center justify-center rounded-xl bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/40 hover:border-primary/50 text-zinc-400 hover:text-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Fingerprint className="size-5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onAddAccount}
        className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
      >
        <Plus className="size-3.5" />
        {t('auth.savedAccount.addAccount')}
      </button>

      {savedAccounts.length > 1 && (
        <button
          type="button"
          onClick={() => {
            rememberedAccounts.clear();
            savedAccounts.forEach((a) => onRemoveAccount(a.userId));
          }}
          className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors py-1"
        >
          {t('auth.savedAccount.forgetAll')}
        </button>
      )}
    </div>
  );
}
