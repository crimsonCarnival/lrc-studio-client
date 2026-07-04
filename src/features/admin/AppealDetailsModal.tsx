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
import { Icon } from '@/shared/ui/Icon';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';

interface AppealUser {
  displayName?: string;
  accountName?: string;
  email?: string;
  ban?: { reason?: string };
  appeal?: { submittedAt?: string; text?: string };
}

interface AppealDetailsModalProps {
  isOpen: boolean;
  user?: AppealUser | null;
  onApprove: (user: AppealUser) => void;
  onReject: (user: AppealUser) => void;
  onCancel: () => void;
}

export default function AppealDetailsModal({ isOpen, user, onApprove, onReject, onCancel }: AppealDetailsModalProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-elevated sm:max-w-[500px] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20">
              <Icon name="format_quote" size={20} className="text-yellow-500" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-100">
                {t('admin.appeal.modalTitle') || 'Review Appeal'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                {user.displayName || user.accountName} • {user.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* User Status Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                {t('admin.table.reasonLabel') || 'Original Reason'}
              </span>
              <p className="text-xs text-zinc-300 italic">"{user.ban?.reason || 'No reason provided'}"</p>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                {t('admin.appeal.submittedAt') || 'Submitted At'}
              </span>
              <div className="flex items-center gap-1.5 text-zinc-300 text-xs" suppressHydrationWarning>
                <Icon name="schedule" size={14} className="text-zinc-500" />
                {user.appeal?.submittedAt ? formatInTimezone(user.appeal.submittedAt, settings.advanced?.timezone, {}, i18n.resolvedLanguage || i18n.language) : '-'}
              </div>
            </div>
          </div>

          {/* Appeal Content */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 relative">
            <div className="absolute top-3 right-3 opacity-20">
              <Icon name="format_quote" size={48} className="text-zinc-500" />
            </div>
            <span className="text-[10px] font-bold text-yellow-500/70 uppercase tracking-widest mb-2 block">
              {t('admin.banned.yourAppealLabel') || 'User Appeal'}
            </span>
            <div className="text-sm text-zinc-200 leading-relaxed max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {user.appeal?.text}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3 sm:gap-3 bg-zinc-950/50 -mx-6 -mb-6 p-6 mt-2 border-t border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="flex-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            {t('common.cancel') || 'Close'}
          </Button>

          <div className="flex gap-2 flex-[2]">
            <Button
              type="button"
              onClick={() => onReject(user)}
              className="flex-1 bg-zinc-800 hover:bg-red-500/20 text-red-400 border border-red-500/10"
            >
              <Icon name="cancel" size={16} className="mr-2" />
              {t('admin.table.rejectAppeal')}
            </Button>
            <Button
              type="button"
              onClick={() => onApprove(user)}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
            >
              <Icon name="check_circle" size={16} className="mr-2" />
              {t('admin.table.unban')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
