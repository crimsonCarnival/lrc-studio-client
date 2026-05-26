import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@ui/button';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { auth } from '@/app/api';
import toast from 'react-hot-toast';

export default function PasskeySection() {
  const { t, i18n } = useTranslation();
  const { registerPasskey } = useAuthContext();
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchPasskeys = useCallback(async () => {
    try {
      const data = await auth.getPasskeys();
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
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const success = await registerPasskey();
      if (success) {
        toast.success(t('auth.passkeyManagement.created', 'Passkey created successfully!'));
        await fetchPasskeys();
      }
    } catch (err) {
      if (err.code === 'email_not_verified') {
        toast.error(t('auth.passkeyManagement.emailNotVerified', 'Please verify your email before adding a passkey.'));
      } else {
        toast.error(t('auth.passkeyManagement.createFailed', 'Failed to create passkey.'));
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await auth.deletePasskey(id);
      toast.success(t('auth.passkeyManagement.deleted', 'Passkey deleted.'));
      await fetchPasskeys();
    } catch (err) {
      toast.error(t('auth.passkeyManagement.deleteFailed', 'Failed to delete passkey.'));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(i18n.resolvedLanguage || i18n.language);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between ml-1 mb-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          {t('auth.passkeyManagement.title', 'Passkeys')}
        </label>
        <Button
          size="sm"
          onClick={handleRegister}
          disabled={registering || loading}
          className="shrink-0 rounded-lg h-7 text-[11px] font-bold gap-1.5"
        >
          {registering ? <Loader2 className="size-3 animate-spin" /> : <Fingerprint className="size-3" />}
          {t('auth.passkeyManagement.add', 'Add Passkey')}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : passkeys.length === 0 ? (
          <div className="flex items-center justify-between bg-secondary/30 border border-border rounded-xl px-3 h-11">
            <span className="text-sm text-muted-foreground">
              {t('auth.passkeyManagement.none', 'No passkeys registered')}
            </span>
          </div>
        ) : (
          passkeys.map(passkey => (
            <div key={passkey.id} className="flex items-center justify-between bg-secondary/30 border border-border rounded-xl px-3 h-11">
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-foreground truncate font-medium flex items-center gap-2">
                  <Fingerprint className="size-3.5 text-zinc-500" />
                  {t('auth.passkeyManagement.passkeyLabel', 'Passkey')}
                </span>
                <span className="text-[10px] text-muted-foreground/70 truncate">
                  {t('auth.passkeyManagement.added', { date: formatDate(passkey.createdAt) })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(passkey.id)}
                disabled={deletingId === passkey.id}
                className="size-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 shrink-0"
                title={t('auth.passkeyManagement.delete', 'Delete Passkey')}
              >
                {deletingId === passkey.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
