import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog';
import { Button } from '@ui/button';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface RegistrationBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorDetails?: string;
}

export default function RegistrationBlockedModal({ isOpen, onClose, errorDetails }: RegistrationBlockedModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-elevated sm:max-w-[450px] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />

        <DialogHeader className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="size-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
              <ShieldAlert className="size-6 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-zinc-100">
                {t('auth.registrationBlockedTitle') || 'Registration Restricted'}
              </DialogTitle>
              <DialogDescription className="text-xs text-red-400 font-bold uppercase tracking-wider">
                {t('auth.securityNotice') || 'Security Violation Detected'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-300 leading-relaxed">
                {errorDetails || t('auth.registrationBlockedMessage') || 'This email, username, or network has been flagged due to previous policy violations.'}
              </p>
            </div>
            <p className="text-xs text-zinc-500 italic pl-7">
              {t('auth.registrationBlockedDetail') || 'To maintain platform integrity, we do not allow new accounts to be created using credentials associated with banned users.'}
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4 pb-2">
          <Button
            type="button"
            onClick={onClose}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold h-11 rounded-xl transition-all"
          >
            {t('common.close') || 'I understand'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
