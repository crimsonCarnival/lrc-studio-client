import { useState, useLayoutEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollLock } from '@/shared/hooks/useScrollLock';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Checkbox } from '@ui/checkbox';

interface BanUser {
  displayName?: string;
  accountName?: string;
}

interface BanPayload {
  reason: string;
  bannedUntil: string | null;
  banIp: boolean;
  banDevice: boolean;
}

interface BanUserModalProps {
  isOpen: boolean;
  user?: BanUser | null;
  onConfirm: (payload: BanPayload) => void;
  onCancel: () => void;
}

export default function BanUserModal({ isOpen, user, onConfirm, onCancel }: BanUserModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    reason: '',
    bannedUntil: '',
    banIp: false,
    banDevice: false
  });

  useScrollLock(isOpen);

  const inputRef = useRef<HTMLInputElement>(null);

  const prevIsOpenRef = useRef(isOpen);
  useLayoutEffect(() => {
    if (prevIsOpenRef.current !== isOpen) {
      prevIsOpenRef.current = isOpen;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isOpen) setForm({ reason: '', bannedUntil: '', banIp: false, banDevice: false });
    }
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    let isoDate: string | null = null;
    if (form.bannedUntil) {
      isoDate = new Date(form.bannedUntil).toISOString();
    }
    onConfirm({
      reason: form.reason,
      bannedUntil: isoDate,
      banIp: form.banIp,
      banDevice: form.banDevice
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-elevated sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              {t('admin.table.banTitle')}: {user?.displayName || user?.accountName}
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-400 leading-relaxed mt-2">
              {t('admin.table.promptBanReason')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-zinc-300">
                {t('admin.table.banReasonLabel')}
              </Label>
              <Input
                id="reason"
                ref={inputRef}
                value={form.reason}
                onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder={t('admin.table.banReasonPlaceholder')}
                className="bg-zinc-800/50 border-zinc-700 focus-visible:ring-red-500/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bannedUntil" className="text-zinc-300">
                {t('admin.table.banDuration')}
              </Label>
              <Input
                id="bannedUntil"
                type="datetime-local"
                value={form.bannedUntil}
                onChange={(e) => setForm(f => ({ ...f, bannedUntil: e.target.value }))}
                className="bg-zinc-800/50 border-zinc-700 focus-visible:ring-red-500/50 [color-scheme:dark]"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-x-2">
                <Checkbox
                  id="banIp"
                  checked={form.banIp}
                  onCheckedChange={(c) => setForm(f => ({ ...f, banIp: !!c }))}
                  className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                />
                <Label htmlFor="banIp" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                  {t('admin.table.banIpAddress')}
                </Label>
              </div>

              <div className="flex items-center gap-x-2">
                <Checkbox
                  id="banDevice"
                  checked={form.banDevice}
                  onCheckedChange={(c) => setForm(f => ({ ...f, banDevice: !!c }))}
                  className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                />
                <Label htmlFor="banDevice" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                  {t('admin.table.banDeviceFingerprint')}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              {t('admin.table.confirmBan')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
