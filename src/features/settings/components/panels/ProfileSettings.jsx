import { useTranslation } from 'react-i18next';
import PasswordSection from '../PasswordSection.jsx';
import AvatarUpload from './profile/AvatarUpload';
import ProfileForm from './profile/ProfileForm';
import ConnectedAccounts from './profile/ConnectedAccounts';

export default function ProfileSettings({ searchTerm }) {
  const { t } = useTranslation();

  // When searching, hide if not matching
  const matchesSearch = !searchTerm || 
    t('profile.title').toLowerCase().includes(searchTerm.toLowerCase()) ||
    t('profile.username').toLowerCase().includes(searchTerm.toLowerCase()) ||
    t('profile.email').toLowerCase().includes(searchTerm.toLowerCase());

  if (!matchesSearch) return null;

  return (
    <div className="space-y-8">
      <AvatarUpload />
      <div className="space-y-5">
        <ProfileForm />
        <ConnectedAccounts />
        <div className="pt-4 animate-fade-in">
          <PasswordSection />
        </div>
      </div>
    </div>
  );
}

