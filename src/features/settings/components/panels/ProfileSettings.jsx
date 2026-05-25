import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserCircle2,
  ShieldCheck,
  History,
  Link2,
  Fingerprint,
  KeyRound,
} from 'lucide-react';
import PasswordSection from '../PasswordSection.jsx';
import PasskeySection from '../PasskeySection.jsx';
import AvatarUpload from './profile/AvatarUpload';
import ProfileForm from './profile/ProfileForm';
import AccountNameSection from './profile/AccountNameSection';
import EmailSection from './profile/EmailSection';
import ConnectedAccounts from './profile/ConnectedAccounts';
import EmailHistory from './profile/EmailHistory';
import AccountNameHistory from './profile/AccountNameHistory';

/* ─── Sub-tab definitions ───────────────────────────────────────────── */
const PROFILE_TABS = [
  { id: 'account',     labelKey: 'profile.tabs.account',     fallback: 'Account Details', icon: UserCircle2 },
  { id: 'privacy',     labelKey: 'profile.tabs.privacy',     fallback: 'Privacy',          icon: ShieldCheck  },
  { id: 'history',     labelKey: 'profile.tabs.history',     fallback: 'Changes History',  icon: History      },
  { id: 'connections', labelKey: 'profile.tabs.connections', fallback: 'Connections',      icon: Link2        },
];

const PRIVACY_TABS = [
  { id: 'passkeys',  labelKey: 'profile.tabs.passkeys',  fallback: 'Passkeys',  icon: Fingerprint },
  { id: 'passwords', labelKey: 'profile.tabs.passwords', fallback: 'Passwords', icon: KeyRound    },
];

/* ─── Inner sub-tab bar ─────────────────────────────────────────────── */
function SubTabBar({ tabs, active, onChange, size = 'md' }) {
  const { t } = useTranslation();
  const isSmall = size === 'sm';
  return (
    <div
      role="tablist"
      className={`flex gap-1 rounded-xl p-1 bg-secondary/30 border border-border/50 ${isSmall ? 'mb-4' : 'mb-5'}`}
    >
      {tabs.map((tab) => {
        const label = t(tab.labelKey) || tab.fallback;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-1.5 flex-1 justify-center rounded-lg
              transition-all duration-200 font-semibold outline-none
              ${isSmall ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2 text-[11px]'}
              ${isActive
                ? 'bg-primary/15 text-primary shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/30'
              }
            `}
          >
            <tab.icon className={isSmall ? 'size-3 shrink-0' : 'size-3.5 shrink-0'} />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Panel: Account Details ─────────────────────────────────────────── */
function AccountDetailsPanel() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Avatar */}
      <section className="space-y-4">
        <SectionHeading>{t('profile.sections.public', 'Profile picture')}</SectionHeading>
        <AvatarUpload />
      </section>

      <Divider />

      {/* Display name + bio */}
      <section className="space-y-4">
        <SectionHeading>{t('profile.displayName', 'Display name') + ' & ' + t('profile.bio', 'Bio')}</SectionHeading>
        <ProfileForm />
      </section>

      <Divider />

      {/* Email */}
      <section className="space-y-4">
        <SectionHeading>{t('profile.emailSection', 'Email address')}</SectionHeading>
        <EmailSection />
      </section>

      <Divider />

      {/* Account name */}
      <section className="space-y-4">
        <SectionHeading>{t('profile.accountNameSection', 'Account name')}</SectionHeading>
        <AccountNameSection />
      </section>
    </div>
  );
}

/* ─── Panel: Privacy ─────────────────────────────────────────────────── */
function PrivacyPanel() {
  const { t } = useTranslation();
  const [privacyTab, setPrivacyTab] = useState('passkeys');

  return (
    <div className="animate-fade-in">
      <SubTabBar
        tabs={PRIVACY_TABS}
        active={privacyTab}
        onChange={setPrivacyTab}
        size="sm"
      />

      {privacyTab === 'passkeys' && (
        <div className="animate-fade-in space-y-4">
          <SectionHeading>{t('auth.passkeyManagement.title', 'Passkeys')}</SectionHeading>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('profile.privacy.passkeysDesc', 'Passkeys let you sign in using biometrics or a device PIN — no password needed.')}
          </p>
          <PasskeySection />
        </div>
      )}

      {privacyTab === 'passwords' && (
        <div className="animate-fade-in space-y-4">
          <SectionHeading>{t('profile.sections.password', 'Password')}</SectionHeading>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('profile.privacy.passwordDesc', 'Change your account password. You\'ll remain signed in on this device.')}
          </p>
          <PasswordSection />
        </div>
      )}
    </div>
  );
}

/* ─── Panel: Changes History ─────────────────────────────────────────── */
function HistoryPanel() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="space-y-4">
        <SectionHeading>{t('profile.sections.handleHistory', 'Account name history')}</SectionHeading>
        <AccountNameHistory />
      </section>

      <Divider />

      <section className="space-y-4">
        <SectionHeading>{t('profile.sections.emailHistory', 'Email history')}</SectionHeading>
        <EmailHistory />
      </section>
    </div>
  );
}

/* ─── Panel: Connections ─────────────────────────────────────────────── */
function ConnectionsPanel() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 animate-fade-in">
      <SectionHeading>{t('profile.sections.connections', 'Connected accounts')}</SectionHeading>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t('profile.connections.desc', 'Link external accounts to sign in faster and unlock additional features.')}
      </p>
      <ConnectedAccounts />
    </div>
  );
}

/* ─── Shared primitives ──────────────────────────────────────────────── */
function SectionHeading({ children }) {
  return (
    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
      {children}
    </h4>
  );
}

function Divider() {
  return <hr className="border-border/50" />;
}

/* ─── Root export ────────────────────────────────────────────────────── */
export default function ProfileSettings({ searchTerm }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('account');

  const matchesSearch =
    !searchTerm ||
    t('profile.title').toLowerCase().includes(searchTerm.toLowerCase()) ||
    t('profile.accountName').toLowerCase().includes(searchTerm.toLowerCase()) ||
    t('profile.email').toLowerCase().includes(searchTerm.toLowerCase());

  if (!matchesSearch) return null;

  return (
    <div className="flex flex-col gap-0 pb-10">
      {/* ── Profile sub-tab bar ──────────────────────────────────── */}
      <SubTabBar tabs={PROFILE_TABS} active={activeTab} onChange={setActiveTab} />

      {/* ── Active panel ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/50 bg-secondary/10 p-5 lg:p-6">
        {activeTab === 'account'     && <AccountDetailsPanel />}
        {activeTab === 'privacy'     && <PrivacyPanel />}
        {activeTab === 'history'     && <HistoryPanel />}
        {activeTab === 'connections' && <ConnectionsPanel />}
      </div>
    </div>
  );
}
