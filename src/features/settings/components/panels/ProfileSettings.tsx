import { useTranslation } from 'react-i18next';
import AvatarUpload from './profile/AvatarUpload';
import CoverImageUpload from './profile/CoverImageUpload';
import ProfileForm from './profile/ProfileForm';
import AccountNameSection from './profile/AccountNameSection';
import EmailSection from './profile/EmailSection';

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
    tk('profile.avatar'), tk('profile.coverImage'),
    'avatar', 'photo', 'cover', 'banner', 'display name', 'bio', 'email', 'account name', 'username', 'handle', 'profile', 'public',
  ]);

  if (!matches) return null;

  return (
    <>
      <section className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-6">
        <CoverImageUpload />
        <AvatarUpload />
        <ProfileForm identifier={<AccountNameSection />} />
      </section>
      <EmailSection />
    </>
  );
}
