import { useState } from 'react';
import { LogIn, Loader2, Plus, X, Fingerprint } from 'lucide-react';
import { auth } from '@/app/api';
import { translateAuthError } from '@/shared/utils/auth-errors';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { AvatarBadge } from './auth-shared';

// ─── Account Picker — shown on return visits when remembered accounts exist ──

export default function SavedAccountStep({ t, savedAccounts, onProceedToPassword, onAddAccount, onRemoveAccount, onPasskeySuccess }) {
  const [loadingKey, setLoadingKey] = useState(null);
  const [errors, setErrors] = useState({});
  const { loginWithPasskey } = useAuthContext();

  const handleLogin = async (account) => {
    const key = account.userId || account.identifier;
    setLoadingKey(key);
    setErrors((prev) => ({ ...prev, [key]: '' }));
    
    if (account.hasPasskey) {
      try {
        const user = await loginWithPasskey(account.identifier || account.accountName);
        if (user) {
          onPasskeySuccess();
          return;
        }
      } catch (err) {
        console.warn('Passkey login failed, falling back to password', err);
      }
    }

    try {
      const result = await auth.checkIdentifier(account.identifier || account.accountName);
      onProceedToPassword({ identifier: account.identifier || account.accountName, ...result });
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [key]: translateAuthError(t, err, 'login', account.identifier),
      }));
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          {t('auth.savedAccount.continueAs', 'Continue as')}
        </p>

        <div className="flex flex-col gap-2">
          {savedAccounts.map((account) => {
            const key = account.userId || account.identifier;
            const displayName = account.displayName || account.accountName || account.identifier;
            const isLoading = loadingKey === key;

            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => !isLoading && handleLogin(account)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleLogin(account)}
                className="group relative flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/40 hover:border-zinc-600/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                        title={t('auth.savedAccount.removeAccount', 'Forget this account')}
                        className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-all"
                      >
                        <X className="size-3.5" />
                      </button>
                      {account.hasPasskey ? (
                        <Fingerprint className="size-4 text-zinc-600 group-hover:text-primary transition-colors" />
                      ) : (
                        <LogIn className="size-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                      )}
                    </>
                  )}
                </div>
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
        {t('auth.savedAccount.addAccount', 'Add another account')}
      </button>
    </div>
  );
}
