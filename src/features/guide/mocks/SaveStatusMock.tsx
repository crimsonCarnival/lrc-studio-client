import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

const CHIP = 'inline-flex h-8 items-center gap-2 rounded-pill bg-raised px-3.5 text-[15px] font-medium whitespace-nowrap';

// The editor's save-status chip in the states a user meets, plus the undo / redo pair beside it.
// Marks differ by shape and wording, not colour alone, as in the real indicator.
export default function SaveStatusMock() {
  const { t } = useTranslation();
  const states = [
    { key: 'saving', label: t('project.saving'), tone: 'text-subtle', mark: <span className="size-[7px] rounded-full bg-iris" /> },
    { key: 'saved', label: t('project.saved'), tone: 'text-foam', mark: <Icon name="check" size={14} /> },
    { key: 'offline', label: t('editor.statusUnsaved'), tone: 'text-subtle', mark: <span className="size-[7px] rounded-full bg-gold" /> },
  ];
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {states.map((s) => (
          <li key={s.key} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className={`${CHIP} ${s.tone}`}>{s.mark}{s.label}</span>
            <span className="min-w-0 flex-1 basis-56 text-sm text-zinc-400">{t(`guide.mock.save.${s.key}` as never)}</span>
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="flex items-center gap-2 pt-3 border-t border-zinc-800 text-sm text-zinc-300">
        <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-700 px-3"><Icon name="undo" size={16} />{t('editor.undo')}</span>
        <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-700 px-3"><Icon name="redo" size={16} />{t('editor.redo')}</span>
      </div>
    </div>
  );
}
