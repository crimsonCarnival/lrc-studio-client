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

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText, cancelText, variant = 'danger' }) {
  const { t } = useTranslation();
  useScrollLock(isOpen);

  const isDanger = variant === 'danger';

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-elevated">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ${
              isDanger
                ? 'bg-gradient-to-br from-red-600 to-red-800 shadow-red-500/20'
                : 'bg-gradient-to-br from-zinc-600 to-zinc-700 shadow-zinc-500/20'
            }`}>
              {isDanger ? (
                <svg className="size-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : (
                <svg className="size-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-zinc-100">
              {title || t('confirm.action')}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-zinc-400 leading-relaxed mt-2">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 mt-2">
          <AlertDialogCancel
            onClick={onCancel}
            className="flex-1 py-2.5 bg-transparent hover:bg-zinc-800 border-transparent text-zinc-400 hover:text-zinc-200 font-semibold text-sm rounded-xl transition-all"
          >
            {cancelText || t('confirm.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`flex-1 py-2.5 font-semibold text-sm rounded-xl transition-all ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-primary hover:bg-primary-dim text-zinc-950'
            }`}
          >
            {confirmText || t('confirm.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
