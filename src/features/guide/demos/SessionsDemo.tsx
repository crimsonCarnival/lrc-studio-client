import { useEffect, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { LineLockBadge } from '@/features/collab/components/LineLockBadge';
import { SAMPLE_LINES } from './sample-lines';
import { initialSessionsDemoState, MIKA_LINE, sessionsDemoReducer } from './sessions-demo.state';

const BTN = 'h-11 min-w-11 px-4 inline-flex items-center justify-center gap-2 rounded-pill border border-zinc-700 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const ROLES = ['editor', 'viewer'] as const;

// Two people in one session: your cursor, Mika's locked line, the viewer view and the shared save indicator.
export default function SessionsDemo() {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(sessionsDemoReducer, initialSessionsDemoState);
  const { myLine, role, denied, saveState } = state;
  const mika = t('guide.sections.sessions.sampleName');
  const viewer = role === 'viewer';

  useEffect(() => {
    if (saveState !== 'saving') return;
    const id = setInterval(() => dispatch({ type: 'tick', now: Date.now() }), 250);
    return () => clearInterval(id);
  }, [saveState]);

  return (
    <div role="group" aria-label={t('guide.sections.sessions.simLabel')} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label={t('guide.sections.sessions.viewAs')} className="inline-flex rounded-pill border border-zinc-700 p-0.5">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => dispatch({ type: 'setRole', role: r })}
              className={`h-10 min-w-11 px-4 rounded-pill text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${role === r ? 'bg-primary text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'}`}
            >
              {t(`collab.presence.role.${r}`)}
            </button>
          ))}
        </div>
        {viewer && (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-raised px-3 text-[13px] font-semibold text-subtle">
            <Icon name="visibility" size={16} />
            {t('collab.session.viewOnly')}
          </span>
        )}
        <span role="status" className={`ml-auto inline-flex h-8 items-center gap-2 rounded-pill bg-raised px-3.5 text-[15px] font-medium ${saveState === 'saved' ? 'text-foam' : 'text-subtle'}`}>
          {saveState === 'saved' ? <Icon name="check" size={14} /> : <span className="size-[7px] rounded-full bg-iris" />}
          {t(saveState === 'saved' ? 'project.saved' : 'project.saving')}
        </span>
      </div>

      <ul className="flex flex-col gap-2 pt-2">
        {SAMPLE_LINES.map((line, i) => {
          const mine = i === myLine;
          return (
            <li key={line.key} className="relative">
              <button
                type="button"
                aria-pressed={mine}
                aria-label={`${t('collab.settings.locks.line', { n: i + 1 })}: ${t(line.key as never)}`}
                onClick={() => dispatch({ type: 'select', line: i })}
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${mine ? 'border-primary bg-primary/10' : 'border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800'} ${viewer ? 'cursor-default' : ''}`}
              >
                <span aria-hidden className="w-4 shrink-0 font-mono text-xs text-subtle">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{t(line.key as never)}</span>
                {mine && <span className="shrink-0 text-xs font-semibold text-primary">{t('collab.presence.you')}</span>}
              </button>
              {i === MIKA_LINE && <LineLockBadge holder={{ holderConn: 'sample', subject: 'sample', name: mika, colorIndex: 2 }} />}
            </li>
          );
        })}
      </ul>

      <p role="alert" className="min-h-5 text-sm font-semibold text-gold">
        {denied !== null ? t('collab.locks.denied', { name: mika }) : ''}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={viewer} onClick={() => dispatch({ type: 'edit', at: Date.now() })} className={BTN}>
          {t('guide.sections.sessions.edit')}
        </button>
        <p className="min-w-0 flex-1 basis-56 text-xs text-subtle">{t('guide.sections.sessions.simHint')}</p>
      </div>
    </div>
  );
}
