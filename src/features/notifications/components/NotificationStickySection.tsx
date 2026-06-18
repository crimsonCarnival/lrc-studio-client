import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '../timeAgo';

interface StickyNotification {
  type?: string;
  createdAt?: string;
}

function StickyCard({ labelKey, to, createdAt }: { labelKey: 'notifications.verifyEmail' | 'notifications.setPassword'; to: string; createdAt?: string }) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="w-full mx-3 my-2 flex items-center gap-3 rounded-lg border-l-4 border-primary bg-primary/10 px-4 py-3 hover:bg-primary/15 transition-colors text-left"
      style={{ width: 'calc(100% - 1.5rem)' }}
    >
      <Settings size={15} className="shrink-0 text-primary" aria-hidden="true" />
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-sm text-primary">{t(labelKey)}</p>
        {createdAt && (
          <p className="text-xs text-primary/60">{formatTimeAgo(createdAt, t, settings.advanced?.timezone, i18n.resolvedLanguage || i18n.language)}</p>
        )}
      </div>
    </button>
  );
}

export function NotificationStickySection({ notifications }: { notifications: StickyNotification[] }) {
  const verifyEmail = notifications.find(n => n.type === 'verify_email');
  const setPassword = notifications.find(n => n.type === 'set_password');
  if (!verifyEmail && !setPassword) return null;
  return (
    <div>
      {verifyEmail && (
        <StickyCard labelKey="notifications.verifyEmail" to="/settings/profile" createdAt={verifyEmail.createdAt} />
      )}
      {setPassword && (
        <StickyCard labelKey="notifications.setPassword" to="/settings/security?focus=password" createdAt={setPassword.createdAt} />
      )}
    </div>
  );
}
