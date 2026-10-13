import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PasskeySection from '../PasskeySection';
import PasswordSection from '../PasswordSection';
import SessionsSettings from './SessionsSettings';
import ChangesHistorySettings from './ChangesHistorySettings';
import ConnectedAccounts from './profile/ConnectedAccounts';
import { Section } from '../shared';

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

  const highlightClass = "ring-2 ring-primary/60 rounded-xl bg-primary/5";

  const methodsMatch = blockMatches(searchTerm, [
    t('profile.sections.security'), t('auth.passkeyManagement.title'), t('profile.privacy.passkeysDesc'),
    t('profile.sections.password'), t('profile.privacy.passwordDesc'), t('settings.google.label'),
    'passkey', 'biometric', 'pin', 'fingerprint', 'face id', 'webauthn', 'sign in',
    'password', 'credentials', 'change password', 'google', 'connect', 'oauth',
  ]);
  const sessionsMatch = blockMatches(searchTerm, [t('profile.sessions.title'), 'sessions', 'devices', 'sign out']);
  const historyMatch = blockMatches(searchTerm, [t('profile.tabs.history'), 'history', 'account name', 'username', 'handle', 'email', 'changes']);

  return (
    <>
      {methodsMatch && (
        <Section title={t('settings.security.methodsSection')}>
          <div className="divide-y divide-zinc-800">
            <div ref={passkeyRef} tabIndex={-1} className={`outline-none transition-all ${focusCard === 'passkey' ? highlightClass : ''}`}>
              <PasskeySection />
            </div>
            <div ref={passwordRef} tabIndex={-1} className={`outline-none transition-all ${focusCard === 'password' ? highlightClass : ''}`}>
              <PasswordSection />
            </div>
            <ConnectedAccounts />
          </div>
        </Section>
      )}
      {sessionsMatch && <SessionsSettings />}
      {historyMatch && <ChangesHistorySettings />}
    </>
  );
}
