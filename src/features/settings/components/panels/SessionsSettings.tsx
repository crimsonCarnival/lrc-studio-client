import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Section, IconRow, Chip } from '../shared';
import { Button } from '@ui/button';
import { auth } from '@/app/api';
import { formatInTimezone } from '@/shared/utils/date';
import toast from 'react-hot-toast';
import useConfirm from '@/shared/hooks/useConfirm';
import { LogoLoader } from '@ui/LogoLoader';

interface Session {
  id: string;
  deviceType?: string;
  browser?: string;
  deviceName?: string;
  isCurrent?: boolean;
  os?: string;
  ip?: string;
  lastUsedAt?: string;
}

type RequestConfirm = (
  message: string,
  onConfirm: () => void | Promise<void>,
  opts?: { title?: string; variant?: 'danger' | 'default' }
) => void;

function DeviceIcon({ deviceType, className = 'size-4 text-zinc-400' }: { deviceType?: string; className?: string }) {
  if (deviceType === 'mobile') return <Icon name="smartphone" className={className} />;
  if (deviceType === 'tablet') return <Icon name="tablet" className={className} />;
  return <Icon name="desktop_windows" className={className} />;
}

export default function SessionsSettings() {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [requestConfirm, confirmModal] = useConfirm() as [RequestConfirm, ReactNode];

  const fetchSessions = useCallback(async () => {
    try {
      const data = await auth.getSessions() as { sessions?: Session[] };
      setSessions(data?.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleRevoke = (sessionId: string) => {
    requestConfirm(
      t('profile.sessions.revokeConfirm'),
      async () => {
        setRevokingId(sessionId);
        try {
          await auth.revokeSession(sessionId);
          setSessions((prev) => prev.filter((s) => s.id !== sessionId));
          toast.success(t('profile.sessions.revokeSuccess'));
        } catch {
          toast.error(t('profile.sessions.revokeError'));
        } finally {
          setRevokingId(null);
        }
      },
      { variant: 'danger' }
    );
  };

  const handleRevokeAllOthers = () => {
    requestConfirm(
      t('profile.sessions.revokeAllOthersConfirm'),
      async () => {
        setRevokingAll(true);
        try {
          await auth.logoutAll(true);
          setSessions((prev) => prev.filter((s) => s.isCurrent));
          toast.success(t('profile.sessions.revokeAllOthersSuccess'));
        } catch {
          toast.error(t('profile.sessions.revokeError'));
        } finally {
          setRevokingAll(false);
        }
      },
      { variant: 'danger' }
    );
  };

  const locale = i18n.language || 'en';
  const [shownIps, setShownIps] = useState<Set<string>>(() => new Set());
  const toggleIp = (id: string) => setShownIps((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  // Keep the network prefix, hide the host part (a.b.•••.••• / first groups of IPv6).
  const maskIp = (ip: string) => {
    if (ip.includes(':')) return `${ip.split(':').slice(0, 2).join(':')}:••••`;
    return `${ip.split('.').slice(0, 2).join('.')}.•••.•••`;
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div id="section-sessions" className="scroll-mt-4">
      {confirmModal}
      <Section
        title={t('profile.sessions.title')}
        action={otherSessions.length > 0 ? (
          <Button
            variant="outline"
            onClick={handleRevokeAllOthers}
            disabled={revokingAll}
            className="h-10 rounded-[10px] border-zinc-700 bg-transparent text-zinc-100 font-semibold"
          >
            {revokingAll ? <LogoLoader size={14} /> : t('profile.sessions.revokeAllOthers')}
          </Button>
        ) : (
          <Button variant="outline" disabled className="h-10 rounded-[10px] border-zinc-700 bg-transparent text-zinc-500 font-semibold">
            {t('profile.sessions.revokeAllOthers')}
          </Button>
        )}
      >
        {loading ? (
          <div className="flex justify-center py-8"><LogoLoader size={20} className="text-zinc-500" /></div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">{t('profile.sessions.noSessions')}</p>
        ) : (
          <div>
            {sessions.map((session) => (
              <IconRow
                key={session.id}
                icon={<DeviceIcon deviceType={session.deviceType} className="size-5" />}
                title={[session.browser || session.deviceName || t('profile.sessions.unknownDevice'), session.os].filter(Boolean).join(' · ')}
                badge={session.isCurrent ? <Chip>{t('profile.sessions.currentBadge')}</Chip> : undefined}
                description={(
                  <>
                    {session.ip && (
                      <>
                        IP <span className="font-mono">{shownIps.has(session.id) ? session.ip : maskIp(session.ip)}</span>{' '}
                        <Button type="button" variant="link" size={null} onClick={() => toggleIp(session.id)} className="text-[13px] px-1">
                          {shownIps.has(session.id) ? t('profile.sessions.hideIp') : t('profile.sessions.showIp')}
                        </Button>{' · '}
                      </>
                    )}
                    {session.isCurrent ? t('profile.sessions.activeNow') : session.lastUsedAt && (
                      <>{t('profile.sessions.lastActive')}{' '}
                        {formatInTimezone(session.lastUsedAt, 'auto', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }, locale)}
                      </>
                    )}
                  </>
                )}
              >
                {!session.isCurrent && (
                  <Button
                    variant="outline"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokingId === session.id}
                    className="h-10 rounded-[10px] border-zinc-700 bg-transparent text-zinc-100 font-semibold"
                  >
                    {revokingId === session.id ? <LogoLoader size={14} /> : t('profile.sessions.signOut')}
                  </Button>
                )}
              </IconRow>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
