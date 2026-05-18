import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Ban } from 'lucide-react';
import ClientOnlyDate from '@shared/ui/ClientOnlyDate';

export default function AdminDevicesTab({
  deviceForm,
  setDeviceForm,
  handleBlockDevice,
  handleUnblockDevice,
  bannedDevices
}) {
  const { t } = useTranslation();

  return (
    <div className="p-6 flex flex-col h-full gap-6">
      <form onSubmit={handleBlockDevice} className="flex flex-wrap items-end gap-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">{t('admin.table.device')}</label>
          <Input
            placeholder="dv_..."
            value={deviceForm.deviceId}
            onChange={(e) => setDeviceForm({ ...deviceForm, deviceId: e.target.value })}
            className="bg-zinc-900 border-zinc-800"
          />
        </div>
        <div className="flex-[2] min-w-[300px]">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">{t('admin.table.ipReason')}</label>
          <Input
            placeholder={t('admin.table.reasonPlaceholder')}
            value={deviceForm.reason}
            onChange={(e) => setDeviceForm({ ...deviceForm, reason: e.target.value })}
            className="bg-zinc-900 border-zinc-800"
          />
        </div>
        <Button type="submit" disabled={!deviceForm.deviceId} className="bg-primary hover:bg-primary-dim text-zinc-950 gap-2">
          <Ban className="size-4" /> {t('admin.table.ban')}
        </Button>
      </form>

      <div className="flex-1 overflow-y-auto">
        {bannedDevices.length === 0 ? (
          <div className="text-center p-12 text-zinc-500">{t('admin.dashboard.noUsers')}</div>
        ) : (
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
