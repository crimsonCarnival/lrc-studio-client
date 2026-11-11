import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

const STEPS = [
  { icon: 'music_note', title: 'guide.mock.setup.mediaTitle', hint: 'guide.mock.setup.mediaHint' },
  { icon: 'description', title: 'guide.mock.setup.lyricsTitle', hint: 'guide.mock.setup.lyricsHint' },
  { icon: 'arrow_forward', title: 'guide.mock.setup.startTitle', hint: 'guide.mock.setup.startHint' },
] as const;

// Still picture of the setup screen's three stages. The section copy says the same, so it is decoration.
export default function SetupStepperMock() {
  const { t } = useTranslation();
  return (
    <ol aria-hidden="true" className="grid gap-2 sm:grid-cols-3 rounded-xl bg-zinc-900 border border-zinc-800 p-3">
      {STEPS.map((step, i) => (
        <li key={step.title} className={`flex items-start gap-3 rounded-lg p-3 ${i === 0 ? 'bg-zinc-800 border border-zinc-700' : ''}`}>
          <span className="shrink-0 size-9 rounded-lg bg-primary/15 text-primary inline-flex items-center justify-center">
            <Icon name={step.icon} size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-zinc-100">
              <span className="font-mono text-xs text-primary mr-1.5">{i + 1}</span>{t(step.title)}
            </span>
            <span className="block text-xs text-subtle">{t(step.hint)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
