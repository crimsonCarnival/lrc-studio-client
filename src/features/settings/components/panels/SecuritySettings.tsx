import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import PasskeySection from '../PasskeySection';
import PasswordSection from '../PasswordSection';

function blockMatches(searchTerm: string | undefined, labels: string[]) {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

export default function SecuritySettings({ focusCard, searchTerm }: { focusCard?: string; searchTerm?: string }) {
  const { t } = useTranslation();
  const passwordRef = useRef<HTMLDivElement>(null);
  const passkeyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusCard === 'password' && passwordRef.current) {
      passwordRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      passwordRef.current.focus();
    } else if (focusCard === 'passkey' && passkeyRef.current) {
      passkeyRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      passkeyRef.current.focus();
    }
  }, [focusCard]);

  const highlightClass = "ring-2 ring-primary/60 border-primary/50 bg-primary/5 shadow-[0_0_15px_rgba(var(--color-primary),0.1)]";

  const passkeyMatches = blockMatches(searchTerm, [
    t('profile.sections.security'), t('auth.passkeyManagement.title'),
    t('profile.privacy.passkeysDesc'),
    'passkey', 'biometric', 'pin', 'fingerprint', 'face id', 'webauthn', 'sign in',
  ]);
  const passwordMatches = blockMatches(searchTerm, [
    t('profile.sections.password'), t('profile.privacy.passwordDesc'),
    'password', 'sign in', 'credentials', 'change password',
  ]);

  if (!passkeyMatches && !passwordMatches) return null;

  return (
    <div className="settings-section space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon name="verified_user" size={16} className="text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {t('profile.sections.security') || 'Security'}
        </h3>
      </div>

      <div className="flex flex-col gap-4">
        {/* Passkeys Card */}
        {passkeyMatches && (
          <div
            ref={passkeyRef}
            tabIndex={-1}
            className={`rounded-2xl border border-border/50 bg-secondary/10 p-6 transition-all duration-300 outline-none ${
              focusCard === 'passkey' ? highlightClass : 'hover:border-border'
            }`}
          >
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="sm:w-56 shrink-0">
                <h4 className="text-sm font-semibold text-zinc-200">
                  {t('auth.passkeyManagement.title')}
                </h4>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {t('profile.privacy.passkeysDesc')}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <PasskeySection />
              </div>
            </div>
          </div>
        )}

        {/* Password Card */}
        {passwordMatches && (
          <div
            ref={passwordRef}
            tabIndex={-1}
            className={`rounded-2xl border border-border/50 bg-secondary/10 p-6 transition-all duration-300 outline-none ${
              focusCard === 'password' ? highlightClass : 'hover:border-border'
            }`}
          >
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="sm:w-56 shrink-0">
                <h4 className="text-sm font-semibold text-zinc-200">
                  {t('profile.sections.password')}
                </h4>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {t('profile.privacy.passwordDesc')}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <PasswordSection />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
