import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollLock } from '../../hooks/useScrollLock';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PromptModal({ isOpen, title, message, onConfirm, onCancel, confirmText, cancelText, placeholder, defaultValue = '' }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(defaultValue);
  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-elevated sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-100">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-400 leading-relaxed mt-2">
              {message}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="bg-zinc-950 border-zinc-800 text-zinc-200"
            />
          </div>
          <DialogFooter className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              {cancelText || t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 h-10 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold rounded-xl"
            >
              {confirmText || t('common.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
