import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import PasskeySection from '../PasskeySection.jsx';
import PasswordSection from '../PasswordSection.jsx';

function blockMatches(searchTerm, labels) {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

export default function SecuritySettings({ focusCard, searchTerm }) {
  const { t } = useTranslation();
  const passwordRef = useRef(null);
  const passkeyRef = useRef(null);

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
        <ShieldCheck className="size-4 text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {t('profile.sections.security') || 'Security'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Passkeys Card */}
        {passkeyMatches && <div
          ref={passkeyRef}
          tabIndex={-1}
          className={`rounded-2xl border border-border/50 bg-secondary/10 p-5 transition-all duration-300 outline-none ${
            focusCard === 'passkey' ? highlightClass : 'hover:border-border'
          }`}
        >
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-zinc-200">
              {t('auth.passkeyManagement.title', 'Passkeys')}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t('profile.privacy.passkeysDesc', 'Passkeys let you sign in using biometrics or a device PIN — no password needed.')}
            </p>
          </div>
          <PasskeySection />
        </div>}

        {/* Password Card */}
        {passwordMatches && <div
          ref={passwordRef}
          tabIndex={-1}
          className={`rounded-2xl border border-border/50 bg-secondary/10 p-5 transition-all duration-300 outline-none ${
            focusCard === 'password' ? highlightClass : 'hover:border-border'
          }`}
        >
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-zinc-200">
              {t('profile.sections.password', 'Password')}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t('profile.privacy.passwordDesc', 'Change your account password. You\'ll remain signed in on this device.')}
            </p>
          </div>
          <PasswordSection />
        </div>}
      </div>
    </div>
  );
}
