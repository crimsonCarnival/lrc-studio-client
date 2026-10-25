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

  // Naming the page itself ("profile", "public") shows all of it; anything narrower shows
  // only the options it names.
  const wholePage = blockMatches(searchTerm, [
    tk('profile.tabs.account'), tk('profile.title'), tk('profile.sections.public'), 'profile', 'public',
  ]);
  const showCover = wholePage || blockMatches(searchTerm, [tk('profile.coverImage'), 'cover', 'banner']);
  const showAvatar = wholePage || blockMatches(searchTerm, [tk('profile.avatar'), 'avatar', 'photo', 'picture']);
  const showDisplayName = wholePage || blockMatches(searchTerm, [tk('profile.displayName'), 'display name', 'name']);
  const showAccountName = wholePage || blockMatches(searchTerm, [tk('profile.accountNameSection'), tk('profile.accountName'), 'account name', 'username', 'handle']);
  const showBio = wholePage || blockMatches(searchTerm, [tk('profile.bio'), 'bio', 'about']);
  const showEmail = wholePage || blockMatches(searchTerm, [tk('profile.emailSection'), tk('profile.email'), 'email']);

  const showMedia = showCover || showAvatar;
  const showForm = showDisplayName || showAccountName || showBio;
  if (!showMedia && !showForm && !showEmail) return null;

  return (
    <>
      {(showMedia || showForm) && (
        <section className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-6">
          {showMedia && (
            <div className="flex flex-wrap items-start gap-x-6 gap-y-5">
              {showCover && <CoverImageUpload />}
              {showAvatar && <AvatarUpload />}
            </div>
          )}
          {showForm && (
            <ProfileForm
              identifier={<AccountNameSection />}
              show={{ displayName: showDisplayName, identifier: showAccountName, bio: showBio }}
            />
          )}
        </section>
      )}
      {showEmail && <EmailSection />}
    </>
  );
}
