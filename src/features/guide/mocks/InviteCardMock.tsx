import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

type InviteRole = 'editor' | 'viewer';

// Clearly fake: never a real origin or token.
const fakeLink = (role: InviteRole) => `https://example.com/join/example-${role}-link`;
const BTN = 'h-11 px-4 inline-flex items-center justify-center gap-2 rounded-pill border border-zinc-700 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

// The invite step of a session: create an editor or viewer link, which is shown once, and copy it.
export default function InviteCardMock() {
  const { t } = useTranslation();
  const [role, setRole] = useState<InviteRole | null>(null);
  const [feedback, setFeedback] = useState<'copied' | 'failed' | null>(null);

  const create = (next: InviteRole) => { setRole(next); setFeedback(null); };
  const copy = async () => {
    if (!role) return;
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(fakeLink(role));
      setFeedback('copied');
    } catch {
      setFeedback('failed');
    }
  };

  return (
    <div role="group" aria-label={t('guide.sections.sessions.inviteLabel')} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('collab.settings.invites.title')}</span>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => create('editor')} className={BTN}>{t('collab.settings.invites.createEditor')}</button>
        <button type="button" onClick={() => create('viewer')} className={BTN}>{t('collab.settings.invites.createViewer')}</button>
      </div>
      {role && (
        <div className="flex flex-col gap-2 rounded-lg bg-zinc-800/50 p-3">
          <p className="text-sm text-zinc-300">{t('collab.settings.invites.created')}</p>
          <code className="block break-all rounded-md bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300">{fakeLink(role)}</code>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={copy} className={BTN}><Icon name="content_copy" size={16} />{t('collab.settings.invites.copy')}</button>
            <span role="status" className="text-sm text-subtle">
              {feedback === 'copied' && t('collab.settings.invites.copied')}
              {feedback === 'failed' && t('collab.settings.invites.copyFailed')}
            </span>
          </div>
        </div>
      )}
      <p className="text-xs text-subtle">{t('guide.sections.sessions.inviteHint')}</p>
    </div>
  );
}
