import { useTranslation } from 'react-i18next';
import PasswordSection from '../PasswordSection.jsx';
import AvatarUpload from './profile/AvatarUpload';
import ProfileForm from './profile/ProfileForm';
import AccountNameSection from './profile/AccountNameSection';
import EmailSection from './profile/EmailSection';
import ConnectedAccounts from './profile/ConnectedAccounts';

function SectionHeading({ children }) {
  return (
    <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-4 px-0.5">
      {children}
    </h2>
  );
}

export default function ProfileSettings({ searchTerm }) {
  const { t } = useTranslation();

  const matchesSearch = !searchTerm ||
    t('profile.title').toLowerCase().includes(searchTerm.toLowerCase()) ||
    t('profile.accountName').toLowerCase().includes(searchTerm.toLowerCase()) ||
    t('profile.email').toLowerCase().includes(searchTerm.toLowerCase());

  if (!matchesSearch) return null;

  return (
    <div className="space-y-10">

      {/* ── Public Details ─────────────────────────────────── */}
      <section id="section-public" className="scroll-mt-4">
        <SectionHeading>{t('profile.sections.public')}</SectionHeading>
        <div className="space-y-6">
          <AvatarUpload />
          <ProfileForm />
        </div>
      </section>

      <div className="border-t border-border/50" />

      {/* ── Account Details ────────────────────────────────── */}
      <section id="section-account" className="scroll-mt-4">
        <SectionHeading>{t('profile.sections.account')}</SectionHeading>
        <div className="space-y-8">
          <EmailSection />
          <AccountNameSection />
          <PasswordSection />
        </div>
      </section>

      <div className="border-t border-border/50" />

      {/* ── Connections ────────────────────────────────────── */}
      <section id="section-connections" className="scroll-mt-4">
        <SectionHeading>{t('profile.sections.connections')}</SectionHeading>
        <ConnectedAccounts />
      </section>

    </div>
  );
}
