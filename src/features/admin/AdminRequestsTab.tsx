import { useState, useEffect, useCallback } from 'react';
import type { ReactNode, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion as M, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Check, X, RefreshCw, Inbox, Clock, Plus, History } from 'lucide-react';
import { requestsApi, type StaffRequest } from './services/requests.service';
import { isSudoCancelled } from './services/sudo';
import { getSocket } from '@/app/socket.client';

// Request types the inline composer can build (simple payloads). Other types
// (badges/levels) are submitted from their own tabs.
const COMPOSER_TYPES = ['block_ip', 'block_device', 'xp_adjust'] as const;
type ComposerType = (typeof COMPOSER_TYPES)[number];

function RequestComposer({ types, onClose, onSubmitted }: { types: ComposerType[]; onClose: () => void; onSubmitted: () => void }) {
  const { t } = useTranslation();
  const tk = t as (k: string) => string;
  const [type, setType] = useState<ComposerType>(types[0]);
  const [fields, setFields] = useState<Record<string, string>>({ action: 'grant', target: 'all' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setFields(p => ({ ...p, [k]: v }));

  const buildPayload = (): Record<string, unknown> | null => {
    if (type === 'block_ip') return fields.ip?.trim() ? { ip: fields.ip.trim(), reason: fields.reason?.trim() || '' } : null;
    if (type === 'block_device') return fields.deviceId?.trim() ? { deviceId: fields.deviceId.trim(), reason: fields.reason?.trim() || '' } : null;
    // xp_adjust
    const amount = Number(fields.amount);
    if (!amount || amount <= 0) return null;
    return fields.identifier?.trim()
      ? { action: fields.action || 'grant', amount, target: 'users', userIds: [fields.identifier.trim()] }
      : null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) { toast.error(t('admin.requests.composer.invalid')); return; }
    setSaving(true);
    try {
      await requestsApi.submit(type, payload);
      toast.success(t('admin.requests.composer.submitted'));
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error((err as Error)?.message || t('admin.requests.composer.error'));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none';

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <M.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4"
      >
        <h3 className="text-sm font-semibold text-zinc-200">{t('admin.requests.composer.title')}</h3>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-zinc-300 uppercase tracking-widest">{t('admin.requests.composer.type')}</span>
            <select className={inputCls} value={type} onChange={e => setType(e.target.value as ComposerType)}>
              {types.map(ty => <option key={ty} value={ty}>{tk(`admin.requests.types.${ty}`)}</option>)}
            </select>
          </label>

          {type === 'block_ip' && (
            <input className={inputCls} placeholder="1.2.3.4" value={fields.ip ?? ''} onChange={e => set('ip', e.target.value)} required />
          )}
          {type === 'block_device' && (
            <input className={inputCls} placeholder={t('admin.requests.composer.deviceId')} value={fields.deviceId ?? ''} onChange={e => set('deviceId', e.target.value)} required />
          )}
          {(type === 'block_ip' || type === 'block_device') && (
            <input className={inputCls} placeholder={t('admin.requests.composer.reason')} value={fields.reason ?? ''} onChange={e => set('reason', e.target.value)} />
          )}
          {type === 'xp_adjust' && (
            <>
              <select className={inputCls} value={fields.action} onChange={e => set('action', e.target.value)}>
                <option value="grant">{t('admin.requests.composer.grant')}</option>
                <option value="revoke">{t('admin.requests.composer.revoke')}</option>
              </select>
              <input className={inputCls} type="number" min={1} placeholder={t('admin.requests.composer.amount')} value={fields.amount ?? ''} onChange={e => set('amount', e.target.value)} required />
              <input className={inputCls} placeholder={t('admin.requests.composer.identifier')} value={fields.identifier ?? ''} onChange={e => set('identifier', e.target.value)} required />
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              {t('admin.requests.composer.cancel')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-primary text-zinc-950 text-sm font-semibold disabled:opacity-50">
              {saving ? t('admin.requests.composer.submitting') : t('admin.requests.composer.submit')}
            </button>
          </div>
        </form>
      </M.div>
    </div>,
    document.body
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
};

function RequestRow({ req, children }: { req: StaffRequest; children?: ReactNode }) {
  const { t } = useTranslation();
  const tk = t as (k: string) => string;
  return (
    <M.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 leading-tight">{req.summary}</p>
        <p className="text-[11px] text-zinc-500 mt-1">
          {tk(`admin.requests.types.${req.type}`)} · {req.requesterName}
          {req.reviewerName ? ` · ${t('admin.requests.byReviewer', { name: req.reviewerName })}` : ''}
        </p>
        {req.error && <p className="text-[11px] text-red-400 mt-1">{req.error}</p>}
      </div>
      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${STATUS_STYLE[req.status] ?? ''}`}>
        {tk(`admin.requests.status.${req.status}`)}
      </span>
      {children}
    </M.div>
  );
}

export default function AdminRequestsTab() {
  const { t } = useTranslation();
  const [pending, setPending] = useState<StaffRequest[]>([]);
  const [mine, setMine] = useState<StaffRequest[]>([]);
  const [reviewed, setReviewed] = useState<StaffRequest[]>([]);
  const [canReview, setCanReview] = useState(false);
  // Superadmins (and other roles that can't submit any request type) never file
  // requests, so the "My Requests" panel is hidden for them.
  const [canSubmit, setCanSubmit] = useState(false);
  const [composerTypes, setComposerTypes] = useState<ComposerType[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const caps = await requestsApi.capabilities();
      const reviewable = caps.reviewable.length > 0;
      const submittable = caps.submittable.length > 0;
      setCanReview(reviewable);
      setCanSubmit(submittable);
      setComposerTypes(COMPOSER_TYPES.filter(t => caps.submittable.includes(t)));
      const [p, m, rv] = await Promise.all([
        reviewable ? requestsApi.pending() : Promise.resolve([]),
        submittable ? requestsApi.myRequests() : Promise.resolve([]),
        reviewable ? requestsApi.reviewed() : Promise.resolve([]),
      ]);
      setPending(p);
      setMine(m);
      setReviewed(rv);
    } catch {
      toast.error(t('admin.requests.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  // Real-time: refresh the lists when a request notification arrives (a new
  // request to review, or a decision on one of mine) so the tab stays live
  // without a manual reload.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onPush(n: { type?: string }) {
      if (n?.type === 'request_submitted' || n?.type === 'request_reviewed') fetchAll();
    }
    socket.on('notification:push', onPush);
    return () => { socket.off('notification:push', onPush); };
  }, [fetchAll]);

  const decide = async (req: StaffRequest, decision: 'approve' | 'reject') => {
    setBusy(req.id);
    try {
      await requestsApi.review(req.id, decision);
      toast.success(t(decision === 'approve' ? 'admin.requests.approved' : 'admin.requests.rejected'));
      setPending(prev => prev.filter(r => r.id !== req.id));
      fetchAll();
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error((err as Error)?.message || t('admin.requests.actionError'));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={fetchAll}
          className="size-8 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-all"
        >
          <RefreshCw className="size-3.5" />
        </button>
        {composerTypes.length > 0 && (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-zinc-950 text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3.5" />
            {t('admin.requests.newRequest')}
          </button>
        )}
      </div>

      <AnimatePresence>
        {composerOpen && (
          <RequestComposer types={composerTypes} onClose={() => setComposerOpen(false)} onSubmitted={fetchAll} />
        )}
      </AnimatePresence>

      {canReview && (
        <section className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
            <Inbox className="size-3" /> {t('admin.requests.toReview')}
          </p>
          {pending.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">{t('admin.requests.noneToReview')}</p>
          ) : (
            <AnimatePresence>
              {pending.map(req => (
                <RequestRow key={req.id} req={req}>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={busy === req.id}
                      onClick={() => decide(req, 'approve')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50 transition-colors"
                    >
                      <Check className="size-3" /> {t('admin.requests.approve')}
                    </button>
                    <button
                      type="button"
                      disabled={busy === req.id}
                      onClick={() => decide(req, 'reject')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                    >
                      <X className="size-3" /> {t('admin.requests.reject')}
                    </button>
                  </div>
                </RequestRow>
              ))}
            </AnimatePresence>
          )}
        </section>
      )}

      {canSubmit && (
        <section className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
            <Clock className="size-3" /> {t('admin.requests.mine')}
          </p>
          {mine.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">{t('admin.requests.noneMine')}</p>
          ) : (
            <AnimatePresence>
              {mine.map(req => <RequestRow key={req.id} req={req} />)}
            </AnimatePresence>
          )}
        </section>
      )}

      {canReview && reviewed.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
            <History className="size-3" /> {t('admin.requests.reviewedHistory')}
          </p>
          <AnimatePresence>
            {reviewed.map(req => <RequestRow key={req.id} req={req} />)}
          </AnimatePresence>
        </section>
      )}
    </div>
  );
}
