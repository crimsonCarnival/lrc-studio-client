import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, Smartphone, Tablet, Loader2, ShieldOff } from 'lucide-react';
import { Button } from '@ui/button';
import { auth } from '@/app/api';
import { formatInTimezone } from '@/shared/utils/date';
import toast from 'react-hot-toast';
import useConfirm from '@/shared/hooks/useConfirm';

function DeviceIcon({ deviceType, className = 'size-4 text-zinc-400' }) {
  if (deviceType === 'mobile') return <Smartphone className={className} />;
  if (deviceType === 'tablet') return <Tablet className={className} />;
  return <Monitor className={className} />;
}

export default function SessionsSettings() {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [requestConfirm, confirmModal] = useConfirm();

  const fetchSessions = useCallback(async () => {
    try {
      const data = await auth.getSessions();
      setSessions(data?.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleRevoke = (sessionId) => {
    requestConfirm(
      t('profile.sessions.revokeConfirm', 'Sign out this device?'),
      async () => {
        setRevokingId(sessionId);
        try {
          await auth.revokeSession(sessionId);
          setSessions((prev) => prev.filter((s) => s.id !== sessionId));
          toast.success(t('profile.sessions.revokeSuccess', 'Device signed out.'));
        } catch {
          toast.error(t('profile.sessions.revokeError', 'Failed to sign out device.'));
        } finally {
          setRevokingId(null);
        }
      },
      { variant: 'danger' }
    );
  };

  const handleRevokeAllOthers = () => {
    requestConfirm(
      t('profile.sessions.revokeAllOthersConfirm', 'Sign out all other devices?'),
      async () => {
        setRevokingAll(true);
        try {
          await auth.logoutAll(true);
          setSessions((prev) => prev.filter((s) => s.isCurrent));
          toast.success(t('profile.sessions.revokeAllOthersSuccess', 'All other devices signed out.'));
        } catch {
          toast.error(t('profile.sessions.revokeError', 'Failed to sign out devices.'));
        } finally {
          setRevokingAll(false);
        }
      },
      { variant: 'danger' }
    );
  };

  const locale = i18n.language || 'en';

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div id="section-sessions" className="space-y-4 scroll-mt-4">
      {confirmModal}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-sm font-semibold text-zinc-100 contrast-more:text-white">
            {t('profile.sessions.title', 'Active Sessions')}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 contrast-more:text-zinc-300">
            {t('profile.sessions.subtitle', 'Devices currently signed in to your account.')}
          </p>
        </div>
        {otherSessions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRevokeAllOthers}
            disabled={revokingAll}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-8 flex-shrink-0"
          >
            {revokingAll ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <><ShieldOff className="size-3.5 mr-1.5" />{t('profile.sessions.revokeAllOthers', 'Sign out others')}</>
            )}
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-500 py-4 text-center">
          {t('profile.sessions.noSessions', 'No active sessions found.')}
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40"
            >
              <div className="size-9 rounded-lg bg-zinc-700/50 flex items-center justify-center flex-shrink-0">
                <DeviceIcon deviceType={session.deviceType} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {session.browser || session.deviceName || t('profile.sessions.unknownDevice', 'Unknown Device')}
                  </span>
                  {session.isCurrent && (
                    <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
                      {t('profile.sessions.currentBadge', 'This device')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {session.os && (
                    <span className="text-[11px] text-zinc-500">{session.os}</span>
                  )}
                  {session.ip && (
                    <span className="text-[11px] text-zinc-600">· {session.ip}</span>
                  )}
                  {session.lastUsedAt && (
                    <span className="text-[11px] text-zinc-600">
                      · {t('profile.sessions.lastActive', 'Active')}{' '}
                      {formatInTimezone(
                        session.lastUsedAt,
                        'auto',
                        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
                        locale
                      )}
                    </span>
                  )}
                </div>
              </div>

              {!session.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                  className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 text-xs h-8 flex-shrink-0"
                >
                  {revokingId === session.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    t('profile.sessions.signOut', 'Sign out')
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
