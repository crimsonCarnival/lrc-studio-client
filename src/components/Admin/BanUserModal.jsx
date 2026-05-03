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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function BanUserModal({ isOpen, user, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [bannedUntil, setBannedUntil] = useState('');
  const [banIp, setBanIp] = useState(false);
  const [banDevice, setBanDevice] = useState(false);
  
  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setBannedUntil('');
      setBanIp(false);
      setBanDevice(false);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ reason, bannedUntil: bannedUntil || null, banIp, banDevice });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-elevated sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              {t('admin.table.banTitle')}: {user?.username}
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-400 leading-relaxed mt-2">
              {t('admin.table.promptBanReason')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ban-reason" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t('admin.table.reasonLabel') || 'Reason'}
              </Label>
              <Input
                id="ban-reason"
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('admin.table.reasonPlaceholder')}
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="ban-until" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t('admin.table.untilLabel') || 'Banned Until (Optional)'}
              </Label>
              <Input
                id="ban-until"
                type="datetime-local"
                value={bannedUntil}
                onChange={(e) => setBannedUntil(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
              />
              <p className="text-[10px] text-zinc-500 italic">
                {t('admin.table.banUntilHint') || 'Leave empty for permanent ban'}
              </p>
            </div>

            <div className="flex flex-col gap-3 px-1">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="ban-ip" 
                  checked={banIp} 
                  onCheckedChange={setBanIp}
                  className="border-zinc-700 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                />
                <Label 
                  htmlFor="ban-ip" 
                  className="text-xs font-medium text-zinc-300 cursor-pointer select-none"
                >
                  {t('admin.table.banIpLabel') || 'Also ban last known IP address'}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="ban-device" 
                  checked={banDevice} 
                  onCheckedChange={setBanDevice}
                  className="border-zinc-700 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                />
                <Label 
                  htmlFor="ban-device" 
                  className="text-xs font-medium text-zinc-300 cursor-pointer select-none"
                >
                  {t('admin.table.banDeviceLabel') || 'Also ban this specific machine'}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!reason.trim()}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
            >
              {t('admin.table.ban')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
