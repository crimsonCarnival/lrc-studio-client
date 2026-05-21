import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Ban } from 'lucide-react';
import ClientOnlyDate from '@shared/ui/ClientOnlyDate';
import useInputMethod from '@/shared/hooks/useInputMethod';

export default function AdminDevicesTab({
  deviceForm,
  setDeviceForm,
  handleBlockDevice,
  handleUnblockDevice,
  bannedDevices
}) {
  const { t } = useTranslation();
  const inputMethod = useInputMethod();
  const isMobile = inputMethod === 'touch';

  return (
    <div className={`flex flex-col h-full gap-4 sm:gap-6 ${isMobile ? 'p-4' : 'p-6'}`}>
      <form onSubmit={handleBlockDevice} className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-wrap items-end gap-4'} bg-zinc-950/50 p-4 rounded-xl border border-zinc-800`}>
        <div className={isMobile ? 'w-full' : 'flex-1 min-w-[200px]'}>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">{t('admin.table.device')}</label>
          <Input
            placeholder="dv_..."
            value={deviceForm.deviceId}
            onChange={(e) => setDeviceForm(prev => ({ ...prev, deviceId: e.target.value }))}
            className="bg-zinc-900 border-zinc-800 h-10"
          />
        </div>
        <div className={isMobile ? 'w-full' : 'flex-[2] min-w-[300px]'}>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">{t('admin.table.ipReason')}</label>
          <Input
            placeholder={t('admin.table.reasonPlaceholder')}
            value={deviceForm.reason}
            onChange={(e) => setDeviceForm(prev => ({ ...prev, reason: e.target.value }))}
            className="bg-zinc-900 border-zinc-800 h-10"
          />
        </div>
        <Button type="submit" disabled={!deviceForm.deviceId} className={`bg-primary hover:bg-primary-dim text-zinc-950 gap-2 ${isMobile ? 'w-full h-10' : ''}`}>
          <Ban className="size-4" /> {t('admin.table.ban')}
        </Button>
      </form>

      <div className={isMobile ? 'flex-1 overflow-y-auto custom-scrollbar' : 'flex-1 overflow-x-auto'}>
        {bannedDevices.length === 0 ? (
          <div className="text-center p-8 sm:p-12 text-zinc-500">{t('admin.dashboard.noUsers')}</div>
        ) : isMobile ? (
          // Mobile card layout
          <div className="flex flex-col gap-3 p-4">
            {bannedDevices.map(item => (
              <div key={item.id} className="bg-zinc-800/30 rounded-lg p-4 flex flex-col gap-3 border border-zinc-700/50">
                <div>
                  <p className="text-xs font-semibold text-zinc-400 mb-1">{t('admin.table.deviceId')}</p>
                  <p className="font-mono text-xs text-primary font-semibold break-all">{item.deviceId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-400 mb-1">{t('admin.table.ipReason')}</p>
                  <p className="text-xs text-zinc-400 italic">"{item.reason || t('admin.table.noReason')}"</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-400 mb-1">{t('admin.table.added')}</p>
                  <p className="text-xs text-zinc-500">
                    <ClientOnlyDate date={item.createdAt} />
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleUnblockDevice(item.id)}
                  className="mt-2 h-10 text-emerald-500 hover:bg-emerald-500/10 w-full"
                >
                  {t('admin.table.unblock')}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          // Desktop table layout
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-950/30">
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{t('admin.table.deviceId')}</th>
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{t('admin.table.ipReason')}</th>
                <th className="p-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{t('admin.table.added')}</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {bannedDevices.map(item => (
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 font-mono text-xs text-primary font-semibold">{item.deviceId}</td>
                  <td className="p-4 text-xs text-zinc-400 italic">"{item.reason || t('admin.table.noReason')}"</td>
                  <td className="p-4 text-[10px] text-zinc-500">
                    <ClientOnlyDate date={item.createdAt} />
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnblockDevice(item.id)}
                      className="text-emerald-500 hover:bg-emerald-500/10 h-8"
                    >
                      {t('admin.table.unblock')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
