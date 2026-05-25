import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function StickyCard({ labelKey, ctaKey, to }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="mx-3 my-2 flex items-center justify-between gap-3 rounded-lg border-l-4 border-amber-500 bg-amber-500/10 px-4 py-3">
      <p className="text-sm text-amber-200/90">{t(labelKey)}</p>
      <button
        onClick={() => navigate(to)}
        className="shrink-0 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
      >
        {t(ctaKey)}
      </button>
    </div>
  );
}

export function NotificationStickySection({ notifications }) {
  const hasVerifyEmail = notifications.some(n => n.type === 'verify_email');
  const hasSetPassword = notifications.some(n => n.type === 'set_password');
  if (!hasVerifyEmail && !hasSetPassword) return null;
  return (
    <div>
      {hasVerifyEmail && (
        <StickyCard labelKey="notifications.verifyEmail" ctaKey="notifications.verifyEmailCta" to="/settings" />
      )}
      {hasSetPassword && (
        <StickyCard labelKey="notifications.setPassword" ctaKey="notifications.setPasswordCta" to="/settings#password" />
      )}
    </div>
  );
}
