import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

const FingerprintIcon = ({ className }: { className?: string }) => <Icon name="fingerprint" className={className} />;
const KeyRoundIcon = ({ className }: { className?: string }) => <Icon name="key" className={className} />;
const LaptopIcon = ({ className }: { className?: string }) => <Icon name="laptop" className={className} />;
const SmartphoneIcon = ({ className }: { className?: string }) => <Icon name="smartphone" className={className} />;
const Trash2Icon = ({ className }: { className?: string }) => <Icon name="delete" className={className} />;
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

  const getPasskeyInfo = (passkey: Passkey, index: number): { label: string; PasskeyIcon: ({ className }: { className?: string }) => React.ReactElement } => {
    const transports = passkey.transports || [];
    let PasskeyIcon: ({ className }: { className?: string }) => React.ReactElement = LaptopIcon;
    let label;

    if (passkey.deviceName) {
      label = passkey.deviceName;
      const dt = passkey.deviceType;
      PasskeyIcon = dt === 'mobile' || dt === 'tablet' ? SmartphoneIcon
        : transports.includes('usb') ? KeyRoundIcon
        : FingerprintIcon;
    } else if (transports.includes('internal')) {
      label = t('auth.passkeyManagement.platformLabel');
      PasskeyIcon = FingerprintIcon;
    } else if (transports.includes('usb')) {
      label = t('auth.passkeyManagement.usbKeyLabel');
      PasskeyIcon = KeyRoundIcon;
    } else if (transports.includes('hybrid')) {
      label = t('auth.passkeyManagement.phoneLabel');
      PasskeyIcon = SmartphoneIcon;
    } else {
      const number = passkeys.length - index;
      label = t('auth.passkeyManagement.passkeyLabel', { number });
    }

    return { label, PasskeyIcon };
  };

  return (
    <div className="flex flex-col gap-2">
      {loading ? (
        <div className="flex items-center justify-center p-4">
          <Icon name="progress_activity" size={16} className="animate-spin text-muted-foreground" />
        </div>
      ) : passkeys.length === 0 ? (
        <div className="flex items-center justify-between bg-secondary/30 border border-border rounded-xl px-3 h-11">
          <span className="text-sm text-muted-foreground">
            {t('auth.passkeyManagement.none')}
          </span>
        </div>
      ) : (
        passkeys.map((passkey, index) => {
          const { label, PasskeyIcon } = getPasskeyInfo(passkey, index);
          return (
            <div key={passkey.id} className="flex items-center justify-between bg-secondary/30 border border-border rounded-xl px-3 h-11">
              <div className="flex items-center gap-2.5 min-w-0">
                <PasskeyIcon className="size-3.5 text-zinc-400 shrink-0" />
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
                {deletingId === passkey.id ? <Icon name="progress_activity" size={14} className="animate-spin" /> : <Trash2Icon className="size-3.5" />}
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
          {registering ? <Icon name="progress_activity" size={12} className="animate-spin" /> : <FingerprintIcon className="size-3" />}
          {t('auth.passkeyManagement.add')}
        </Button>
      </div>
    </div>
  );
}
