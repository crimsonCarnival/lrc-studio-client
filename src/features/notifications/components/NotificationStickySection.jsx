import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { formatTimeAgo } from '../timeAgo';

function StickyCard({ labelKey, to, createdAt }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="mx-3 my-2 flex items-center justify-between gap-3 rounded-lg border-l-4 border-primary bg-primary/10 px-4 py-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-sm text-primary">{t(labelKey)}</p>
        {createdAt && (
          <p className="text-xs text-primary/60">{formatTimeAgo(createdAt, t)}</p>
        )}
      </div>
      <button
        onClick={() => navigate(to)}
        aria-label={t('notifications.goToSettings')}
        className="shrink-0 p-1.5 rounded-lg text-primary hover:text-primary-dim hover:bg-primary/20 transition-colors"
      >
        <Settings size={15} />
      </button>
    </div>
  );
}

export function NotificationStickySection({ notifications }) {
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
