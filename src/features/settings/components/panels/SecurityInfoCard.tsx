import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { CountryFlag } from '@ui/CountryFlag';

const formatHour = (dateInput?: Date | string | null) => {
  if (!dateInput) return 'Unknown';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** Last device / IP / login time for the signed-in account. */
export default function SecurityInfoCard() {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const { user } = useAuthContext();
  const currentHour = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isLocalIp = user?.lastIp === '127.0.0.1' || user?.lastIp === '::1' || user?.lastIp === 'localhost';

  return (
    <section className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-xs font-bold uppercase tracking-[.09em] text-primary mb-4">{tk('profile.settings.securityInformation')}</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 col-span-2">
          <p className="text-xs text-muted-foreground mb-1">{tk('profile.settings.activeDevice')}</p>
          <p className="font-mono text-zinc-300 mb-2">{user?.lastDevice || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground mb-1">{tk('profile.settings.currentIpAddress')}</p>
          <div className="flex items-center gap-2">
            {isLocalIp ? <Icon name="dns" size={16} className="text-zinc-500" /> : <CountryFlag countryCode={user?.country} />}
            <p className="font-mono text-zinc-300">{user?.lastIp || 'Unknown'}</p>
          </div>
        </div>
        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
          <p className="text-xs text-muted-foreground mb-1">{tk('profile.settings.currentHour')}</p>
          <p className="font-mono text-zinc-300">{currentHour}</p>
        </div>
        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
          <p className="text-xs text-muted-foreground mb-1">{tk('profile.settings.lastLoginHour')}</p>
          <p className="font-mono text-zinc-300">{formatHour(user?.lastLoginAt)}</p>
        </div>
      </div>
    </section>
  );
}
