import { useState, useEffect, useCallback, useRef } from 'react';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint, KeyRound, Laptop, Loader2, Smartphone, Trash2 } from 'lucide-react';
import { Button } from '@ui/button';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';
import { auth } from '@/app/api';
import toast from 'react-hot-toast';

interface Passkey {
  id: string;
  transports?: string[];
  deviceName?: string;
  deviceType?: string;
  createdAt?: string;
}

interface ApiError {
  code?: string;
  message?: string;
}

export default function PasskeySection() {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const { registerPasskey } = useAuthContext();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const registeringRef = useRef(false);

  const fetchPasskeys = useCallback(async () => {
    try {
      const data = await auth.getPasskeys() as { passkeys?: Passkey[] };
      if (data && data.passkeys) {
        setPasskeys(data.passkeys);
      }
    } catch (err) {
      console.error('Failed to fetch passkeys', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleRegister = async () => {
    if (registeringRef.current) return;
    registeringRef.current = true;
    setRegistering(true);
    try {
      const success = await registerPasskey();
      if (success) {
        toast.success(t('auth.passkeyManagement.created'));
        await fetchPasskeys();
      }
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'email_not_verified') {
        toast.error(t('auth.passkeyManagement.emailNotVerified'));
      } else if (err.message?.includes('challenge')) {
        toast.error(t('auth.passkeyManagement.sessionExpired'));
      } else if (err.code === 'credential_already_in_use') {
        toast.error(t('auth.passkeyManagement.alreadyRegistered'));
      } else {
        toast.error(t('auth.passkeyManagement.createFailed'));
      }
    } finally {
      registeringRef.current = false;
      setRegistering(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await auth.deletePasskey(id);
      toast.success(t('auth.passkeyManagement.deleted'));
      await fetchPasskeys();
    } catch {
      toast.error(t('auth.passkeyManagement.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    const date = new Date(dateString ?? '');
    if (isNaN(date.getTime())) return '';
    return formatInTimezone(date, settings.advanced?.timezone, {}, i18n.resolvedLanguage || i18n.language);
  };

  const getPasskeyInfo = (passkey: Passkey, index: number): { label: string; Icon: ComponentType<{ className?: string }> } => {
    const transports = passkey.transports || [];
    let Icon: ComponentType<{ className?: string }> = Laptop;
    let label;

    if (passkey.deviceName) {
      label = passkey.deviceName;
      const dt = passkey.deviceType;
      Icon = dt === 'mobile' || dt === 'tablet' ? Smartphone
        : transports.includes('usb') ? KeyRound
        : Fingerprint;
    } else if (transports.includes('internal')) {
      label = t('auth.passkeyManagement.platformLabel');
      Icon = Fingerprint;
    } else if (transports.includes('usb')) {
      label = t('auth.passkeyManagement.usbKeyLabel');
      Icon = KeyRound;
    } else if (transports.includes('hybrid')) {
      label = t('auth.passkeyManagement.phoneLabel');
      Icon = Smartphone;
    } else {
      const number = passkeys.length - index;
      label = t('auth.passkeyManagement.passkeyLabel', { number });
    }

    return { label, Icon };
  };

  return (
    <div className="flex flex-col gap-2">
      {loading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : passkeys.length === 0 ? (
        <div className="flex items-center justify-between bg-secondary/30 border border-border rounded-xl px-3 h-11">
          <span className="text-sm text-muted-foreground">
            {t('auth.passkeyManagement.none')}
          </span>
        </div>
      ) : (
        passkeys.map((passkey, index) => {
          const { label, Icon } = getPasskeyInfo(passkey, index);
          return (
            <div key={passkey.id} className="flex items-center justify-between bg-secondary/30 border border-border rounded-xl px-3 h-11">
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="size-3.5 text-zinc-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-foreground truncate font-medium leading-tight">
                    {label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 truncate leading-tight">
                    {t('auth.passkeyManagement.added', { date: formatDate(passkey.createdAt) })}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(passkey.id)}
                disabled={deletingId === passkey.id}
                className="size-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 shrink-0"
                title={t('auth.passkeyManagement.delete')}
              >
                {deletingId === passkey.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </Button>
            </div>
          );
        })
      )}

      <div className="mt-1">
        <Button
          size="sm"
          onClick={handleRegister}
          disabled={registering || loading}
          className="rounded-lg h-7 text-[11px] font-bold gap-1.5"
        >
          {registering ? <Loader2 className="size-3 animate-spin" /> : <Fingerprint className="size-3" />}
          {t('auth.passkeyManagement.add')}
        </Button>
      </div>
    </div>
  );
}
