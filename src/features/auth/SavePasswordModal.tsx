import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@ui/dialog';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';

interface SavePasswordModalProps {
  open: boolean;
  /** The account the credential belongs to, shown so the user knows what they're saving. */
  identifier: string;
  displayName?: string;
  avatarUrl?: string | null;
  onSave: () => void;
  /** Continue without saving — this time only. */
  onSkip: () => void;
  /** Continue without saving and never ask again on this device. */
  onNeverAsk: () => void;
}

/**
 * Offered after a successful sign-in/sign-up, before navigating away.
 *
 * This only asks permission — the password itself goes to the browser's own
 * password manager via the Credential Management API, never to our storage.
 * Chrome will show its own confirmation on top of this, which is the one that
 * actually persists anything.
 */
export default function SavePasswordModal({
  open,
  identifier,
  displayName,
  avatarUrl,
  onSave,
  onSkip,
  onNeverAsk,
}: SavePasswordModalProps) {
  const { t } = useTranslation();

  return (
    // Dismissing via overlay/Escape is a skip, not a permanent "never" — a
    // stray Escape should not silently disable the feature forever.
    <Dialog open={open} onOpenChange={(next) => { if (!next) onSkip(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="size-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <Icon name="key" size={16} className="text-primary" />
            </div>
            <DialogTitle className="text-base">{t('auth.savePassword.title')}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            {t('auth.savePassword.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2.5 my-4 px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="size-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
              <Icon name="person" size={16} className="text-zinc-500" />
            </div>
          )}
          <div className="min-w-0">
            {displayName && (
              <p className="text-xs font-semibold text-zinc-200 truncate">{displayName}</p>
            )}
            <p className="text-[11px] text-zinc-500 truncate">{identifier}</p>
          </div>
          {/* The password is never rendered, only implied. */}
          <span className="ml-auto text-zinc-600 tracking-widest text-xs shrink-0">••••••••</span>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={onSave} className="w-full">
            {t('auth.savePassword.save')}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onSkip} className="flex-1 text-zinc-400">
              {t('auth.savePassword.notNow')}
            </Button>
            <Button variant="ghost" onClick={onNeverAsk} className="flex-1 text-zinc-500">
              {t('auth.savePassword.never')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
