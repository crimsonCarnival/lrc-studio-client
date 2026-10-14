import { useTranslation } from 'react-i18next';
import { useScrollLock } from '@/shared/hooks/useScrollLock';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/alert-dialog';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

const ACTION_SIZE = 'h-11 px-[18px] text-base lg:h-11 lg:px-[18px] lg:text-base';

/**
 * Confirmation before an action that cannot be undone (redesign sheet 15). The severity
 * is carried by the confirm button: a filled red one for `danger`, the primary one otherwise.
 * Actions that undo cleanly (deleting a line) should skip this and offer undo in a toast.
 */
export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText, cancelText, variant = 'danger' }: ConfirmModalProps) {
  const { t } = useTranslation();
  useScrollLock(isOpen);

  const isDanger = variant === 'danger';

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title || t('confirm.action')}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost" onClick={onCancel} className={ACTION_SIZE}>
            {cancelText || t('confirm.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            // Filled, unlike the outlined destructive button used inline: here it is the
            // one thing the dialog is asking about.
            className={`${ACTION_SIZE} ${isDanger ? 'bg-love-ink text-primary-foreground shadow-none hover:bg-love-ink/90 active:bg-love-ink/80' : ''}`}
          >
            {confirmText || t('confirm.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
