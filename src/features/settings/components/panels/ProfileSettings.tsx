import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import AvatarUpload from './profile/AvatarUpload';
import ProfileForm from './profile/ProfileForm';
import AccountNameSection from './profile/AccountNameSection';
import EmailSection from './profile/EmailSection';


function SectionHeading({ children }: { children?: ReactNode }) {
  return (
    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
      {children}
    </h4>
  );
}

function Divider() {
  return <hr className="border-border/50" />;
}

function blockMatches(searchTerm: string | undefined, labels: string[]) {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return labels.some(l => l.toLowerCase().includes(q));
}

export default function ProfileSettings({ searchTerm }: { searchTerm?: string }) {
  const { t } = useTranslation();
  // Search-label lookups include keys not all present in typed resources.
  const tk = t as (key: string) => string;

  const matches = blockMatches(searchTerm, [
    tk('profile.tabs.account'), tk('profile.title'),
    tk('profile.sections.public'), tk('profile.displayName'), tk('profile.bio'),
    tk('profile.emailSection'), tk('profile.email'),
    tk('profile.accountNameSection'), tk('profile.accountName'),
    tk('profile.showFollowers'), tk('profile.avatar'),
    'avatar', 'photo', 'display name', 'bio', 'email', 'username', 'handle',
    'followers', 'profile', 'public',
  ]);

  if (!matches) return null;

  return (
    <div className="settings-section space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon name="account_circle" size={16} className="text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {t('profile.tabs.account')}
        </h3>
      </div>

      <div className="rounded-2xl border border-border/50 bg-secondary/10 p-5 lg:p-6 space-y-6">
        {/* Avatar */}
        <section className="space-y-4">
          <SectionHeading>{t('profile.sections.public')}</SectionHeading>
          <AvatarUpload />
        </section>

        <Divider />

        {/* Display name + bio + visibility */}
        <ProfileForm />



        {/* Email */}
        <section className="space-y-4">
          <SectionHeading>{t('profile.emailSection')}</SectionHeading>
          <EmailSection />
        </section>

        <Divider />

        {/* Username */}
        <section className="space-y-4">
          <SectionHeading>{t('profile.accountNameSection')}</SectionHeading>
          <AccountNameSection />
        </section>


      </div>
    </div>
  );
}
