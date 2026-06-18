import { useState, useEffect, useCallback } from 'react';
import { motion as M, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Pencil, Trash2, ChevronUp, ChevronDown, X, Music2 } from 'lucide-react';
import { gqlRequest } from '@/app/graphql.client';

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_LEVELS = /* GraphQL */ `
  query AdminAddictionLevels {
    adminAddictionLevels {
      id title { en es } description { en es } order
      requirements {
        syncedLines karaokeLines musicSyncedMinutes
        publicProjects starsReceived wordsTimestamped totalProjects
      }
    }
  }
`;

const CREATE_LEVEL = /* GraphQL */ `
  mutation CreateLevel($input: AddictionLevelInput!) {
    adminCreateAddictionLevel(input: $input) {
      id title { en es } description { en es } order
      requirements {
        syncedLines karaokeLines musicSyncedMinutes
        publicProjects starsReceived wordsTimestamped totalProjects
      }
    }
  }
`;

const UPDATE_LEVEL = /* GraphQL */ `
  mutation UpdateLevel($id: String!, $input: AddictionLevelUpdateInput!) {
    adminUpdateAddictionLevel(id: $id, input: $input) {
      id title { en es } description { en es } order
      requirements {
        syncedLines karaokeLines musicSyncedMinutes
        publicProjects starsReceived wordsTimestamped totalProjects
      }
    }
  }
`;

const DELETE_LEVEL = /* GraphQL */ `
  mutation DeleteLevel($id: String!) { adminDeleteAddictionLevel(id: $id) }
`;

// ─── Requirement field definitions ───────────────────────────────────────────

const REQ_FIELDS = [
  { key: 'syncedLines',        suffixKey: 'lines'    },
  { key: 'karaokeLines',       suffixKey: 'lines'    },
  { key: 'musicSyncedMinutes', suffixKey: 'minutes'  },
  { key: 'wordsTimestamped',   suffixKey: 'words'    },
  { key: 'totalProjects',      suffixKey: 'projects' },
  { key: 'publicProjects',     suffixKey: 'projects' },
  { key: 'starsReceived',      suffixKey: 'stars'    },
];

// ─── Form Modal ───────────────────────────────────────────────────────────────

const BLANK_FORM = {
  id: '', title: { en: '', es: '' }, description: { en: '', es: '' }, order: 0,
  requirements: {
    syncedLines: 0, karaokeLines: 0, musicSyncedMinutes: 0,
    publicProjects: 0, starsReceived: 0, wordsTimestamped: 0, totalProjects: 0,
  },
};

function LevelFormModal({ editing, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() =>
    editing
      ? {
          id: editing.id,
          title: editing.title,
          description: editing.description ?? { en: '', es: '' },
          order: editing.order ?? 0,
          requirements: { ...BLANK_FORM.requirements, ...(editing.requirements ?? {}) },
        }
      : { ...BLANK_FORM }
  );
  const [saving, setSaving] = useState(false);

  const setReq = (key, val) =>
    setForm(p => ({ ...p, requirements: { ...p.requirements, [key]: Number(val) || 0 } }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const requirements = Object.fromEntries(
        Object.entries(form.requirements).map(([k, v]) => [k, Number(v) || 0])
      );

        const titleInput = {
          en: form.title.en.trim(),
          es: form.title.es?.trim() || form.title.en.trim(),
        };
        const descriptionInput = {
          en: form.description.en?.trim() ?? '',
          es: form.description.es?.trim() ?? '',
        };

      if (editing) {
        const { adminUpdateAddictionLevel } = await gqlRequest(UPDATE_LEVEL, {
          id: editing.id,
          input: { title: titleInput, description: descriptionInput, order: Number(form.order), requirements },
        });
        onSaved(adminUpdateAddictionLevel, 'update');
      } else {
        const { adminCreateAddictionLevel } = await gqlRequest(CREATE_LEVEL, {
          input: {
            id: form.id.trim().toLowerCase().replace(/\s+/g, '_'),
            title: titleInput,
            description: descriptionInput,
            order: Number(form.order),
            requirements,
          },
        });
        onSaved(adminCreateAddictionLevel, 'create');
      }
      onClose();
    } catch (err) {
      toast.error(err.message || t('admin.levels.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <M.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <Music2 className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-zinc-200">
              {editing
                ? t('admin.levels.modal.editTitle', { title: editing.title?.en || editing.id })
                : t('admin.levels.modal.newTitle')}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 flex flex-col gap-5 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="flex flex-col gap-4">
              {!editing && (
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-zinc-300 uppercase tracking-widest">{t('admin.levels.modal.levelId')}</span>
                  <input
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none"
                    placeholder={t('admin.levels.modal.levelIdPlaceholder')}
                    value={form.id}
                    onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
                    required
                    pattern="^[a-z0-9_-]+$"
                    title={t('admin.levels.modal.levelIdHint')}
                  />
                </label>
              )}

              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="text-[11px] text-zinc-300 uppercase tracking-widest">
                    {t('admin.levels.modal.titleField')} (EN)
                  </span>
                  <input
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none"
                    placeholder="English Title"
                    value={form.title.en}
                    onChange={e => setForm(p => ({ ...p, title: { ...p.title, en: e.target.value } }))}
                    required
                    maxLength={60}
                  />
                </label>
                
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-zinc-300 uppercase tracking-widest">{t('admin.levels.modal.order')}</span>
                  <input
                    type="number"
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-primary/50 focus:outline-none"
                    value={form.order}
                    onChange={e => setForm(p => ({ ...p, order: e.target.value }))}
                    min={0}
                  />
                </label>

                <label className="col-span-3 flex flex-col gap-1">
                  <span className="text-[11px] text-zinc-300 uppercase tracking-widest">
                    {t('admin.levels.modal.titleField')} (ES)
                  </span>
                  <input
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none"
                    placeholder="Spanish Title"
                    value={form.title.es}
                    onChange={e => setForm(p => ({ ...p, title: { ...p.title, es: e.target.value } }))}
                    maxLength={60}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-zinc-300 uppercase tracking-widest">
                  {t('admin.levels.modal.descriptionField')} (EN)
                </span>
                <input
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none"
                  placeholder="English Description"
                  value={form.description.en}
                  onChange={e => setForm(p => ({ ...p, description: { ...p.description, en: e.target.value } }))}
                  maxLength={200}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-zinc-300 uppercase tracking-widest">
                  {t('admin.levels.modal.descriptionField')} (ES)
                </span>
                <input
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none"
                  placeholder="Spanish Description"
                  value={form.description.es}
                  onChange={e => setForm(p => ({ ...p, description: { ...p.description, es: e.target.value } }))}
                  maxLength={200}
                />
              </label>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-300 uppercase tracking-widest">{t('admin.levels.modal.requirements')}</span>
                  <span className="text-[10px] text-zinc-500">{t('admin.levels.modal.requirementsHint')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
                  {REQ_FIELDS.map(f => (
                    <div key={f.key} className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-400 truncate" title={t(`admin.levels.req.${f.key}`)}>
                        {t(`admin.levels.req.${f.key}`)}
                      </span>
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-sm text-zinc-200 focus:border-primary/50 focus:outline-none placeholder:text-zinc-500"
                        placeholder="0"
                        value={form.requirements[f.key] || ''}
                        onChange={e => setReq(f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">{t('admin.levels.modal.requirementsZeroHint')}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              {t('admin.levels.modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-zinc-950 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving && <span className="size-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />}
              {editing ? t('admin.levels.modal.update') : t('admin.levels.modal.create')}
            </button>
          </div>
        </form>
      </M.div>
    </div>
  );
}

// ─── Level card ───────────────────────────────────────────────────────────────

function LevelCard({ level, rank, total, onEdit, onDelete, onMove }) {
  const { t, i18n } = useTranslation();
  const hasReqs = REQ_FIELDS.some(f => (level.requirements?.[f.key] ?? 0) > 0);

  const lang = i18n.language === 'es' ? 'es' : 'en';
  const titleText = level.title?.[lang] || level.title?.en || level.id;
  const descriptionText = level.description?.[lang] || level.description?.en || '';

  return (
    <M.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className="group flex items-start gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 hover:border-primary/20 transition-all"
    >
      <div className="flex flex-col items-center gap-0.5 mt-0.5 shrink-0">
        <button
          type="button"
          disabled={rank === 0}
          onClick={() => onMove(level, 'up')}
          className="size-5 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 transition-colors"
        >
          <ChevronUp className="size-3.5" />
        </button>
        <span className="text-[10px] font-bold text-zinc-400 tabular-nums w-5 text-center">#{rank + 1}</span>
        <button
          type="button"
          disabled={rank === total - 1}
          onClick={() => onMove(level, 'down')}
          className="size-5 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 transition-colors"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-200 leading-tight">
              {titleText}
            </p>
            {descriptionText && (
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {descriptionText}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={() => onEdit(level)}
              className="size-6 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(level)}
              className="size-6 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {hasReqs ? (
            REQ_FIELDS.filter(f => (level.requirements?.[f.key] ?? 0) > 0).map(f => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {t(`admin.levels.req.${f.key}`)} ≥ {level.requirements[f.key].toLocaleString()}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-zinc-500 border border-zinc-800">
              {t('admin.levels.alwaysShown')}
            </span>
          )}
        </div>
      </div>
    </M.div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function AdminLevelsTab() {
  const { t, i18n } = useTranslation();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState(null);

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    try {
      const { adminAddictionLevels } = await gqlRequest(GET_LEVELS);
      setLevels([...adminAddictionLevels].sort((a, b) => b.order - a.order));
    } catch {
      toast.error(t('admin.levels.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLevels();
  }, [fetchLevels]);

  const handleSaved = (level, type) => {
    const lang = i18n.language === 'es' ? 'es' : 'en';
    const title = level.title?.[lang] || level.title?.en || level.id;
    if (type === 'create') {
      setLevels(prev => [...prev, level].sort((a, b) => b.order - a.order));
      toast.success(t('admin.levels.createSuccess', { title }));
    } else {
      setLevels(prev => prev.map(l => l.id === level.id ? level : l).sort((a, b) => b.order - a.order));
      toast.success(t('admin.levels.updateSuccess', { title }));
    }
  };

  const handleDelete = async (level) => {
    const lang = i18n.language === 'es' ? 'es' : 'en';
    const title = level.title?.[lang] || level.title?.en || level.id;
    if (!window.confirm(t('admin.levels.deleteConfirm', { title }))) return;
    try {
      await gqlRequest(DELETE_LEVEL, { id: level.id });
      setLevels(prev => prev.filter(l => l.id !== level.id));
      toast.success(t('admin.levels.deleteSuccess', { title: level.title?.en || level.id }));
    } catch (err) {
      toast.error(err.message || t('admin.levels.deleteError'));
    }
  };

  const handleMove = async (level, direction) => {
    const sorted = [...levels].sort((a, b) => b.order - a.order);
    const idx = sorted.findIndex(l => l.id === level.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];
    const newOrderA = b.order;
    const newOrderB = a.order;

    const updated = sorted.map(l => {
      if (l.id === a.id) return { ...l, order: newOrderA };
      if (l.id === b.id) return { ...l, order: newOrderB };
      return l;
    }).sort((x, y) => y.order - x.order);
    setLevels(updated);

    try {
      await Promise.all([
        gqlRequest(UPDATE_LEVEL, { id: a.id, input: { order: newOrderA } }),
        gqlRequest(UPDATE_LEVEL, { id: b.id, input: { order: newOrderB } }),
      ]);
    } catch {
      toast.error(t('admin.levels.reorderError'));
      fetchLevels();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-400">{t('admin.levels.description')}</p>
        </div>
        <button
          type="button"
          onClick={fetchLevels}
          className="size-8 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-all"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => setFormModal('new')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-zinc-950 text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" />
          {t('admin.levels.newLevel')}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { labelKey: 'total',            value: levels.length },
          { labelKey: 'withRequirements', value: levels.filter(l => REQ_FIELDS.some(f => (l.requirements?.[f.key] ?? 0) > 0)).length },
          { labelKey: 'catchAll',         value: levels.filter(l => REQ_FIELDS.every(f => (l.requirements?.[f.key] ?? 0) === 0)).length },
        ].map(stat => (
          <div key={stat.labelKey} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50 text-center">
            <p className="text-lg font-bold text-zinc-200">{stat.value}</p>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{t(`admin.levels.stats.${stat.labelKey}`)}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {levels.map((level, idx) => (
              <LevelCard
                key={level.id}
                level={level}
                rank={idx}
                total={levels.length}
                onEdit={l => setFormModal(l)}
                onDelete={handleDelete}
                onMove={handleMove}
              />
            ))}
          </AnimatePresence>
          {levels.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="text-4xl opacity-20">🎵</span>
              <p className="text-sm text-zinc-400">{t('admin.levels.empty')}</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {formModal && (
          <LevelFormModal
            editing={formModal === 'new' ? null : formModal}
            onClose={() => setFormModal(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
