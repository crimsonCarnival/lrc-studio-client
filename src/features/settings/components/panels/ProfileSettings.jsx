import { useTranslation } from 'react-i18next';
import { UserCircle2 } from 'lucide-react';
import AvatarUpload from './profile/AvatarUpload';
import ProfileForm from './profile/ProfileForm';
import AccountNameSection from './profile/AccountNameSection';
import EmailSection from './profile/EmailSection';

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

function blockMatches(searchTerm, labels) {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

export default function ProfileSettings({ searchTerm }) {
  const { t } = useTranslation();

  const matches = blockMatches(searchTerm, [
    t('profile.tabs.account'), t('profile.title'),
    t('profile.sections.public'), t('profile.displayName'), t('profile.bio'),
    t('profile.emailSection'), t('profile.email'),
    t('profile.accountNameSection'), t('profile.accountName'),
    t('profile.showFollowers'), t('profile.avatar'),
    'avatar', 'photo', 'display name', 'bio', 'email', 'username', 'handle',
    'followers', 'profile', 'public',
  ]);

  if (!matches) return null;

  return (
    <div className="settings-section space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <UserCircle2 className="size-4 text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {t('profile.tabs.account', 'Account Details')}
        </h3>
      </div>

      <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6 space-y-6">
        {/* Avatar */}
        <section className="space-y-4">
          <SectionHeading>{t('profile.sections.public', 'Profile picture')}</SectionHeading>
          <AvatarUpload />
        </section>

        <Divider />

        {/* Display name + bio + visibility */}
        <ProfileForm />

        <Divider />

        {/* Email */}
        <section className="space-y-4">
          <SectionHeading>{t('profile.emailSection', 'Email address')}</SectionHeading>
          <EmailSection />
        </section>

        <Divider />

        {/* Username */}
        <section className="space-y-4">
          <SectionHeading>{t('profile.accountNameSection', 'Username')}</SectionHeading>
          <AccountNameSection />
        </section>
      </div>
    </div>
  );
}
