import { useTranslation } from 'react-i18next';
import SessionsDemo from '../demos/SessionsDemo';
import InviteCardMock from '../mocks/InviteCardMock';

const P = 'text-sm text-zinc-400 leading-relaxed';
const H = 'text-base font-semibold text-zinc-100';
const STEPS = ['step1', 'step2', 'step3'] as const;
const SAVING = ['saveBody1', 'saveBody2', 'saveBody3', 'saveBody4'] as const;

export default function SessionsSection() {
  const { t } = useTranslation();
  const names = { start: t('collab.settings.start'), new: t('collab.sessions.new') };
  return (
    <>
      <p className={P}>{t('guide.sections.sessions.body1')}</p>

      <h3 className={H}>{t('guide.sections.sessions.startTitle')}</h3>
      <ol className="grid gap-2 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step} className="flex gap-3 rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-zinc-950">{i + 1}</span>
            <span className="min-w-0 text-sm text-zinc-300">{t(`guide.sections.sessions.${step}` as never, names)}</span>
          </li>
        ))}
      </ol>
      <p className={P}>{t('guide.sections.sessions.startNote')}</p>
      <InviteCardMock />

      <h3 className={H}>{t('guide.sections.sessions.insideTitle')}</h3>
      <p className={P}>{t('guide.sections.sessions.insideBody')}</p>
      <SessionsDemo />

      <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 flex flex-col gap-2">
        <h3 className={H}>{t('guide.sections.sessions.saveTitle')}</h3>
        {SAVING.map((key) => <p key={key} className="text-sm text-zinc-300 leading-relaxed">{t(`guide.sections.sessions.${key}` as never)}</p>)}
      </div>
    </>
  );
}
