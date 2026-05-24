import { useTranslation } from 'react-i18next';
import { Mailbox, History } from 'lucide-react';
import PasswordSection from '../PasswordSection.jsx';
import AvatarUpload from './profile/AvatarUpload';
import ProfileForm from './profile/ProfileForm';
import AccountNameSection from './profile/AccountNameSection';
import EmailSection from './profile/EmailSection';
import ConnectedAccounts from './profile/ConnectedAccounts';
import SessionsSettings from './SessionsSettings';
import SettingsCard from './profile/SettingsCard';
import EmailHistory from './profile/EmailHistory';
import AccountNameHistory from './profile/AccountNameHistory';

export default function ProfileSettings({ searchTerm }) {
  const { t } = useTranslation();

  const matchesSearch = !searchTerm ||
    t('profile.title').toLowerCase().includes(searchTerm.toLowerCase()) ||
    t('profile.accountName').toLowerCase().includes(searchTerm.toLowerCase()) ||
    t('profile.email').toLowerCase().includes(searchTerm.toLowerCase());

  if (!matchesSearch) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start pb-10">
      
      {/* ── Left Column ─────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        <SettingsCard title={t('profile.sections.public', 'Datos públicos')}>
          <div className="space-y-6">
            <AvatarUpload />
            <ProfileForm />
          </div>
        </SettingsCard>

        <SettingsCard title={t('profile.sections.account', 'Detalles de la cuenta')}>
          <div className="space-y-6">
            <EmailSection />
            <AccountNameSection />
          </div>
        </SettingsCard>

        <SettingsCard title={t('profile.sections.emailHistory', 'Historial de correos')} icon={Mailbox}>
          <EmailHistory />
        </SettingsCard>
      </div>

      {/* ── Right Column ────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        <SettingsCard title={t('profile.sections.password', 'Gestión de contraseña')}>
          <PasswordSection />
        </SettingsCard>

        <SettingsCard title={t('profile.sections.connections', 'Conexiones')}>
          <ConnectedAccounts />
        </SettingsCard>

        <SettingsCard title={t('profile.sections.handleHistory', 'Historial de identificadores')} icon={History}>
          <AccountNameHistory />
        </SettingsCard>

        <SettingsCard title={t('profile.sections.security', 'Seguridad')}>
          <SessionsSettings />
        </SettingsCard>
      </div>

    </div>
  );
}
