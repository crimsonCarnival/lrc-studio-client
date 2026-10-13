import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { TFunction } from 'i18next';
import { Icon } from '@/shared/ui/Icon';
import { auth } from '@/app/api';
import { translateAuthError } from '@/shared/utils/auth-errors';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { AvatarBadge, AuthHeading } from './auth-shared';
import { rememberedAccounts } from '@/features/auth/services/remembered-accounts.service';
import { LogoLoader } from '@ui/LogoLoader';
import { Tip } from '@ui/tip';

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
  onProceedToPassword: (data: { identifier?: string;[key: string]: unknown }) => void;
  onGoogleLogin?: (identifier?: string) => void | Promise<void>;
  onAddAccount: () => void;
  onRemoveAccount: (userId: string) => void;
  onPasskeySuccess: () => void;
  onSwitchToRegister: () => void;
}

// ─── Account Picker — shown on return visits when remembered accounts exist ──

export default function SavedAccountStep({ t, savedAccounts, accountsChecked, onProceedToPassword, onGoogleLogin, onAddAccount, onRemoveAccount, onPasskeySuccess, onSwitchToRegister }: SavedAccountStepProps) {
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
      <div className="animate-fade-in flex flex-col gap-6" aria-hidden="true">
        <div>
          <div className="h-8 w-48 rounded bg-zinc-800 mb-6 animate-pulse" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 p-4 rounded-xl bg-zinc-900 border border-zinc-700"
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
    <div className="animate-fade-in flex flex-col gap-6">
      <AuthHeading
        title={t('auth.savedAccount.welcomeBack')}
        subtitle={t('auth.savedAccount.pickAccount')}
      />

      <ul className="flex flex-col gap-2">
        {savedAccounts.map((account) => {
          const key = account.userId || account.identifier || '';
          const displayName = account.displayName || account.accountName || account.identifier || '';
          const isLoading = loadingKey === key;

          return (
            // One bordered row holding three separate controls — sign in,
            // passkey (when set up) and remove — so each is its own tab stop
            // and none is nested inside another button.
            <li key={key} className="flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 p-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleLogin(account)}
                  disabled={isLoading}
                  className="group flex-1 min-w-0 flex items-center gap-3.5 px-2.5 py-2 rounded-lg text-left hover:bg-zinc-800 transition-colors"
                >
                  <AvatarBadge
                    accountName={account.accountName || account.identifier}
                    avatarUrl={account.avatarUrl}
                    size="md"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold text-zinc-100 truncate">{displayName}</span>
                    {account.accountName && (
                      <span className="block font-mono text-[13px] text-foreground/65 truncate">{account.accountName}</span>
                    )}
                  </span>
                  {isLoading
                    ? <LogoLoader size={16} className="shrink-0 text-foreground/65" />
                    : <Icon name="chevron_right" size={18} className="shrink-0 text-foreground/65 group-hover:text-zinc-100 transition-colors" />}
                </button>

                {account.hasPasskey && (
                  <Tip content={t('auth.savedAccount.usePasskey')}>
                    <button
                      type="button"
                      onClick={(e) => handlePasskey(e, account)}
                      disabled={isLoading}
                      aria-label={t('auth.savedAccount.usePasskey')}
                      className="shrink-0 size-11 flex items-center justify-center rounded-lg text-foreground/65 hover:text-primary hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Icon name="fingerprint" size={20} />
                    </button>
                  </Tip>
                )}

                <Tip content={t('auth.savedAccount.removeAccount')}>
                  <button
                    type="button"
                    onClick={() => onRemoveAccount(account.userId)}
                    aria-label={t('auth.savedAccount.removeNamed', { name: displayName })}
                    className="shrink-0 size-11 flex items-center justify-center rounded-lg text-foreground/45 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </Tip>
              </div>
              {errors[key] && (
                <p role="alert" className="px-2.5 pb-1.5 text-[13px] text-destructive">{errors[key]}</p>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAddAccount}
        className="h-12 rounded-[10px] border border-dashed border-zinc-700 hover:border-primary/60 hover:bg-zinc-900 text-zinc-100 text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-colors"
      >
        <Icon name="add" size={16} />
        {t('auth.savedAccount.addAccount')}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-foreground/65">
        <p>
          {t('auth.noAccount')}{' '}
          <button type="button" onClick={onSwitchToRegister} className="font-semibold text-primary hover:underline">
            {t('auth.register')}
          </button>
        </p>
        {savedAccounts.length > 1 && (
          <button
            type="button"
            onClick={() => {
              rememberedAccounts.clear();
              savedAccounts.forEach((a) => onRemoveAccount(a.userId));
            }}
            className="hover:text-destructive transition-colors"
          >
            {t('auth.savedAccount.forgetAll')}
          </button>
        )}
      </div>
    </div>
  );
}
