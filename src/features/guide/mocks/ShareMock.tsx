import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

// The visibility choice a publish offers, and the fork switch from the share dialog.
export default function ShareMock() {
  const { t } = useTranslation();
  const choices = [
    { label: t('project.choicePublic'), lead: t('project.choicePublicLead'), icon: 'public', active: true },
    { label: t('project.choiceUnlisted'), lead: t('project.choiceUnlistedLead'), icon: 'link', active: false },
  ];
  return (
    <div aria-hidden="true" className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex flex-col gap-3">
      <span className="text-xs text-subtle">{t('project.visibilityChoice')}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map((c) => (
          <div key={c.label} className={`flex flex-col gap-1 rounded-lg border p-3 ${c.active ? 'border-primary bg-primary/10' : 'border-zinc-700'}`}>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-100"><Icon name={c.icon} size={16} />{c.label}</span>
            <span className="text-xs text-zinc-400">{c.lead}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-zinc-800 pt-3">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('share.forksEnabled')}</span>
        <span className="h-4 w-8 rounded-full bg-primary p-0.5"><span className="ml-auto block size-3 rounded-full bg-zinc-950" /></span>
      </div>
    </div>
  );
}
