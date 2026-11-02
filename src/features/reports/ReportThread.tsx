import { useId, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@ui/button';
import { LogoLoader } from '@ui/LogoLoader';
import { Icon } from '@/shared/ui/Icon';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '@/features/notifications/time-ago';
import { addReportMessage, listReportMessages, reportErrorKey, REPORT_MESSAGE_MAX } from './reports.service';
import type { ReportMessage } from './reports.service';

const reportThreadKey =(reportId: string) => ['reportMessages', reportId] as const;

/** A text box with a counter and a send button; Ctrl+Enter sends. */
function MessageComposer({ placeholder, submitLabel, autoFocus, busy, onSubmit, onCancel }: {
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  busy: boolean;
  onSubmit: (body: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const [body, setBody] = useState('');
  const counterId = useId();
  const trimmed = body.trim();

  const submit = async () => {
    if (!trimmed || busy) return;
    if (await onSubmit(trimmed)) setBody('');
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void submit();
    if (e.key === 'Escape' && onCancel) onCancel();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <textarea
          value={body}
          autoFocus={autoFocus}
          onChange={(e) => setBody(e.target.value.slice(0, REPORT_MESSAGE_MAX))}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-describedby={counterId}
          rows={2}
          className="w-full resize-y rounded-xl border border-border bg-raised/50 px-3 py-2 pb-6 text-sm text-foreground placeholder:text-subtle outline-none focus:border-primary/50"
        />
        <span id={counterId} className="pointer-events-none absolute bottom-2 right-3 font-mono text-[11px] tabular-nums text-subtle">
          {body.length}/{REPORT_MESSAGE_MAX}
        </span>
      </div>
      <div className="flex items-center justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel}>{t('common.cancel')}</Button>}
        <Button type="button" size="sm" disabled={!trimmed || busy} onClick={submit}>
          {busy ? <LogoLoader size={12} /> : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function MessageRow({ message, moderatorView, onReply }: {
  message: ReportMessage;
  /** The viewer is a moderator: label the reporter's messages, and show moderators by name. */
  moderatorView: boolean;
  onReply?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const { author } = message;
  // The reporter never learns which moderator wrote; those messages arrive without an author.
  const anonymousModerator = !author && !message.fromReporter;
  const name = message.mine
    ? t('reports.thread.you')
    : anonymousModerator ? t('reports.thread.moderator') : author ? (author.displayName || author.accountName) : t('reports.preview.unknownUser');

  return (
    <div className="flex gap-2.5">
      {anonymousModerator ? (
        <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-ink">
          <Icon name="shield" size={14} />
        </span>
      ) : author?.avatarUrl ? (
        <img src={author.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-7 shrink-0 rounded-full object-cover" />
      ) : (
        <InitialsAvatar name={name} handle={author?.accountName ?? name} className="size-7 shrink-0 rounded-full text-[11px]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
          <span className="font-semibold text-foreground">{name}</span>
          {/* Who's who in the conversation: moderators see who reported; everyone sees who moderates. */}
          {message.fromReporter && moderatorView && (
            <span className="rounded-full bg-zinc-800 px-1.5 py-px text-[10px] font-semibold text-zinc-300">{t('reports.thread.reporterBadge')}</span>
          )}
          {!message.fromReporter && !anonymousModerator && (
            <span className="rounded-full bg-primary-soft px-1.5 py-px text-[10px] font-semibold text-primary-ink">{t('reports.thread.moderatorBadge')}</span>
          )}
          <span className="text-subtle">{formatTimeAgo(message.createdAt, t, settings.advanced?.timezone, i18n.language)}</span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-zinc-300">{message.body}</p>
        {onReply && (
          <button
            type="button"
            onClick={onReply}
            className="mt-1 inline-flex items-center gap-1 rounded text-xs text-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-focus coarse:min-h-11"
          >
            <Icon name="reply" size={13} /> {t('reports.thread.reply')}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The conversation on one report, between its reporter and the moderators: comments, each
 * with one level of replies. Fetched when mounted, so callers mount it on demand.
 */
export function ReportThread({ reportId, moderatorView }: { reportId: string; moderatorView: boolean }) {
  const { t } = useTranslation();
  const tk = t as (k: string, o?: Record<string, unknown>) => string;
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const { data: messages, isPending, isError, refetch } = useQuery({
    queryKey: reportThreadKey(reportId),
    queryFn: () => listReportMessages(reportId),
  });
  const send = useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId: string | null }) => addReportMessage(reportId, body, parentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportThreadKey(reportId) }),
  });

  const submit = (parentId: string | null) => async (body: string): Promise<boolean> => {
    try {
      await send.mutateAsync({ body, parentId });
      if (parentId) setReplyingTo(null);
      return true;
    } catch (err) {
      toast.error(tk(reportErrorKey(err)));
      return false;
    }
  };

  if (isPending) return <div className="flex justify-center py-3"><LogoLoader size={16} /></div>;
  if (isError) {
    return (
      <p className="flex items-center gap-2 text-xs text-zinc-400">
        {t('reports.thread.loadError')}
        <Button type="button" variant="link" size={null} onClick={() => refetch()} className="text-xs">{t('reports.page.retry')}</Button>
      </p>
    );
  }

  return (
    <section aria-label={t('reports.thread.title')} className="flex flex-col gap-3">
      {messages.length === 0 && (
        <p className="text-xs text-subtle">{moderatorView ? t('reports.thread.emptyModerator') : t('reports.thread.emptyReporter')}</p>
      )}
      <ul className="flex flex-col gap-3">
        {messages.map((m) => (
          <li key={m.id} className="flex flex-col gap-2">
            <MessageRow message={m} moderatorView={moderatorView} onReply={() => setReplyingTo(replyingTo === m.id ? null : m.id)} />
            {(m.replies.length > 0 || replyingTo === m.id) && (
              <div className="ml-3.5 flex flex-col gap-2.5 border-l-2 border-zinc-800 pl-4">
                {m.replies.map((r) => <MessageRow key={r.id} message={r} moderatorView={moderatorView} />)}
                {replyingTo === m.id && (
                  <MessageComposer
                    autoFocus
                    placeholder={t('reports.thread.replyPlaceholder')}
                    submitLabel={t('reports.thread.reply')}
                    busy={send.isPending}
                    onSubmit={submit(m.id)}
                    onCancel={() => setReplyingTo(null)}
                  />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <MessageComposer
        placeholder={moderatorView ? t('reports.thread.placeholderModerator') : t('reports.thread.placeholderReporter')}
        submitLabel={t('reports.thread.send')}
        busy={send.isPending}
        onSubmit={submit(null)}
      />
      {!moderatorView && <p className="text-[11px] text-subtle">{t('reports.thread.privacy')}</p>}
    </section>
  );
}

/**
 * A "Conversation (n)" toggle that mounts the thread when opened, so a long list of reports
 * doesn't fetch every conversation up front.
 */
export function ReportThreadToggle({ reportId, count, moderatorView, defaultOpen = false }: {
  reportId: string;
  count: number;
  moderatorView: boolean;
  /** Opened from a notification link to this report. */
  defaultOpen?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-primary focus-visible:outline-2 focus-visible:outline-focus coarse:min-h-11"
      >
        <Icon name="forum" size={14} />
        {count > 0 ? t('reports.thread.toggleCount', { count }) : t('reports.thread.toggle')}
        <Icon name={open ? 'expand_less' : 'expand_more'} size={14} />
      </button>
      {open && (
        <div id={panelId} className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-3">
          <ReportThread reportId={reportId} moderatorView={moderatorView} />
        </div>
      )}
    </div>
  );
}
