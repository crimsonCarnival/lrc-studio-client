import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { m as M, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Scan, Pencil, Trash2, Award, Users, ChevronDown, X, Search, UserPlus } from 'lucide-react';
import { gqlRequest } from '@/app/graphql.client';
import { BadgeChip } from '@/features/badges/BadgeChip';
import { BADGE_COLORS, RARITY_CONFIG } from '@/features/badges/badge-registry';

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_BADGE_DEFS = `
  query {
    badgeDefinitions {
      id label description icon color conditionType conditionValue autoGrant isBuiltin holderCount xpReward
    }
  }
`;
const CREATE_BADGE = `
  mutation CreateBadge($input: BadgeDefInput!) {
    adminCreateBadge(input: $input) {
      id label description icon color conditionType conditionValue autoGrant isBuiltin holderCount
    }
  }
`;
const UPDATE_BADGE = `
  mutation UpdateBadge($id: String!, $input: BadgeDefInput!) {
    adminUpdateBadge(id: $id, input: $input) {
      id label description icon color conditionType conditionValue autoGrant isBuiltin holderCount xpReward
    }
  }
`;
const DELETE_BADGE = `
  mutation DeleteBadge($id: String!) { adminDeleteBadge(id: $id) }
`;
const RETROACTIVE = `
  mutation Retro($badgeId: String!) {
    adminRetroactiveScan(badgeId: $badgeId) { granted scanned error }
  }
`;
const GRANT_BADGE = `
  mutation Grant($userId: ID!, $badgeId: String!) { adminGrantBadge(userId: $userId, badgeId: $badgeId) }
`;

const CONDITION_TYPES = [
  { value: 'registration_rank',    label: 'Registration rank (first N users)'     },
  { value: 'minutes_synced',       label: 'Minutes synced (≥ N)'                 },
  { value: 'words_synced',         label: 'Words timestamped (≥ N)'              },
  { value: 'karaoke_lines',        label: 'Karaoke lines (≥ N)'                  },
  { value: 'project_count',        label: 'Projects created (≥ N)'               },
  { value: 'public_project_count', label: 'Public projects (≥ N)'               },
  { value: 'stars_received',       label: 'Stars received (≥ N)'                 },
  { value: 'forks_received',       label: 'Work forked (≥ N times)'              },
  { value: 'follower_count',       label: 'Followers (≥ N)'                      },
  { value: 'upload_count',         label: 'Uploads (≥ N)'                        },
  { value: 'account_age_days',     label: 'Account age (≥ N days)'               },
  { value: 'streak_days',          label: 'Activity streak (≥ N days)'           },
  { value: 'is_verified',          label: 'Email verified'                        },
  { value: 'role_admin',           label: 'Is platform admin'                     },
  { value: 'manual',               label: 'Manual (admin grant only)'             },
];

const COLORS = ['amber', 'teal', 'green', 'primary', 'rose', 'blue', 'orange', 'shimmer'];

const needsValue = (ct) => !['is_verified', 'role_admin', 'manual'].includes(ct);

// ─── Badge preview chip ───────────────────────────────────────────────────────

function LivePreview({ form }) {
  if (!form.label) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-zinc-800 text-zinc-700 text-xs">
        <span>—</span>
        <span>Preview</span>
      </div>
    );
  }

  const colorConf = BADGE_COLORS[form.color] ?? BADGE_COLORS.primary;
  const isShimmer = form.color === 'shimmer';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
      isShimmer
        ? 'border-amber-400/30 bg-gradient-to-r from-warning/10 via-primary/10 to-accent-blue/10'
        : `${colorConf.text} bg-zinc-900 ${colorConf.border}`
    }`}>
      {isShimmer ? (
        <span className="badge-shimmer-txt">{form.label}</span>
      ) : (
        <span className={colorConf.text}>{form.label}</span>
      )}
    </span>
  );
}

// ─── Badge form modal ─────────────────────────────────────────────────────────

const BLANK_FORM = {
  id: '', label: '', description: '', icon: '',
  color: 'primary', conditionType: 'manual', conditionValue: null, autoGrant: false, xpReward: 50,
};

function BadgeFormModal({ editing, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(editing ?? BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const input = {
        label: form.label.trim(),
        description: form.description?.trim() ?? '',
        icon: form.icon,
        color: form.color,
        conditionType: form.conditionType,
        conditionValue: needsValue(form.conditionType) ? Number(form.conditionValue) : null,
        autoGrant: form.autoGrant,
        xpReward: Math.max(0, Number(form.xpReward) || 0),
        ...(editing ? {} : { id: form.id.trim().toLowerCase().replace(/\s+/g, '_') }),
      };

      if (editing) {
        const { adminUpdateBadge } = await gqlRequest(UPDATE_BADGE, { id: editing.id, input });
        onSaved(adminUpdateBadge, 'update');
      } else {
        const { adminCreateBadge } = await gqlRequest(CREATE_BADGE, { input });
        onSaved(adminCreateBadge, 'create');
      }
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to save badge');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <M.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <Award className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-zinc-200">
              {editing ? `Edit "${editing.label}"` : 'New Badge'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {/* Live preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
            <span className="text-[11px] text-zinc-600 uppercase tracking-widest">Preview</span>
            <LivePreview form={form} />
          </div>

          {/* ID — only for new badges */}
          {!editing && (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500 uppercase tracking-widest">Badge ID</span>
              <input
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:border-primary/50 focus:outline-none"
                placeholder="e.g. early_bird"
                value={form.id}
                onChange={e => set('id', e.target.value)}
                required
                pattern="^[a-z0-9_-]+$"
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Icon */}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500 uppercase tracking-widest">Icon</span>
              <input
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-lg focus:border-primary/50 focus:outline-none text-center"
                value={form.icon}
                onChange={e => set('icon', e.target.value)}
                maxLength={2}
                required
              />
            </label>
            {/* Label */}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500 uppercase tracking-widest">Label</span>
              <input
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:border-primary/50 focus:outline-none"
                placeholder="Badge Name"
                value={form.label}
                onChange={e => set('label', e.target.value)}
                required
                maxLength={50}
              />
            </label>
          </div>

          {/* Description */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-zinc-500 uppercase tracking-widest">Description</span>
            <input
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:border-primary/50 focus:outline-none"
              placeholder="What did the user do to earn this?"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              maxLength={200}
            />
          </label>

          {/* Color swatches */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] text-zinc-500 uppercase tracking-widest">Color</span>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => {
                const cc = BADGE_COLORS[c] ?? BADGE_COLORS.primary;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('color', c)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all capitalize
                      ${form.color === c ? `${cc.text} ${cc.border} bg-zinc-800` : 'border-zinc-800 text-zinc-700 hover:border-zinc-700'}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Condition */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-zinc-500 uppercase tracking-widest">Condition</span>
            <select
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-primary/50 focus:outline-none"
              value={form.conditionType}
              onChange={e => set('conditionType', e.target.value)}
            >
              {CONDITION_TYPES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>

          {needsValue(form.conditionType) && (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500 uppercase tracking-widest">Threshold Value</span>
              <input
                type="number"
                min={1}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-primary/50 focus:outline-none"
                value={form.conditionValue ?? ''}
                onChange={e => set('conditionValue', e.target.value)}
                required
              />
            </label>
          )}

          {/* XP Reward */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-zinc-500 uppercase tracking-widest">XP Reward</span>
            <input
              type="number"
              min={0}
              step={25}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-primary/50 focus:outline-none"
              value={form.xpReward ?? 50}
              onChange={e => set('xpReward', e.target.value)}
            />
          </label>

          {/* Auto-grant toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              className={`relative w-9 h-5 rounded-full transition-colors ${form.autoGrant ? 'bg-primary' : 'bg-zinc-700'}`}
              onClick={() => set('autoGrant', !form.autoGrant)}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.autoGrant ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-zinc-400">Auto-grant when condition is met</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-zinc-950 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving && <span className="size-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />}
              {editing ? 'Update' : 'Create Badge'}
            </button>
          </div>
        </form>
      </M.div>
    </div>
  );
}

// ─── Badge card ───────────────────────────────────────────────────────────────

function BadgeCard({ def, onEdit, onDelete, onRetroactive, onGrant, retroLoading }) {
  const colorConf = BADGE_COLORS[def.color] ?? BADGE_COLORS.primary;
  const conditionLabel = CONDITION_TYPES.find(c => c.value === def.conditionType)?.label ?? def.conditionType;

  return (
    <M.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className={`group flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900/60 border ${colorConf.border} hover:border-opacity-60 transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <BadgeChip id={def.id} />
              {def.isBuiltin && (
                <span className="text-[9px] text-zinc-600 border border-zinc-800 px-1 py-0.5 rounded uppercase tracking-widest">built-in</span>
              )}
            </div>
            <p className="text-[10px] text-zinc-600 mt-0.5">{def.description || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => onEdit(def)} className="size-6 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors">
            <Pencil className="size-3" />
          </button>
          {!def.isBuiltin && (
            <button type="button" onClick={() => onDelete(def)} className="size-6 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <Users className="size-3" />
          <span>{def.holderCount.toLocaleString()} holders</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-amber-600">
          <span>⚡</span>
          <span>{(def.xpReward ?? 50).toLocaleString()} XP</span>
        </div>
        <div className={`flex items-center gap-1 text-[10px] ${def.autoGrant ? 'text-emerald-600' : 'text-zinc-700'}`}>
          <div className={`size-1.5 rounded-full ${def.autoGrant ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
          <span>{def.autoGrant ? 'Auto-grant' : 'Manual only'}</span>
        </div>
      </div>

      {/* Condition */}
      <div className="text-[10px] text-zinc-700 bg-zinc-950/60 rounded-lg px-2 py-1.5 border border-zinc-800/40">
        <span className="text-zinc-600">Condition: </span>
        {conditionLabel}{def.conditionValue != null ? ` (${def.conditionValue.toLocaleString()})` : ''}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onGrant(def)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all border border-zinc-700/50"
        >
          <UserPlus className="size-3" />
          Grant to user
        </button>
        <button
          type="button"
          onClick={() => onRetroactive(def.id)}
          disabled={retroLoading === def.id}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-zinc-800 hover:bg-primary/20 text-zinc-400 hover:text-primary transition-all border border-zinc-700/50 disabled:opacity-50"
        >
          {retroLoading === def.id ? (
            <span className="size-3 rounded-full border border-primary border-t-transparent animate-spin" />
          ) : (
            <Scan className="size-3" />
          )}
          Retroactive scan
        </button>
      </div>
    </M.div>
  );
}

// ─── Grant modal ──────────────────────────────────────────────────────────────

function GrantModal({ badge, onClose }) {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const grant = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await gqlRequest(GRANT_BADGE, { userId: userId.trim(), badgeId: badge.id });
      toast.success(`Granted "${badge.label}" to user`);
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to grant badge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <M.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-200">Grant "{badge.label}"</h3>
        </div>
        <form onSubmit={grant} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-zinc-500 uppercase tracking-widest">User ID (MongoDB _id)</span>
            <input
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:border-primary/50 focus:outline-none font-mono"
              placeholder="507f1f77bcf86cd799439011"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              required
            />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-primary text-zinc-950 text-sm font-semibold disabled:opacity-50">
              {loading ? 'Granting…' : 'Grant'}
            </button>
          </div>
        </form>
      </M.div>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function AdminBadgesTab() {
  const { t } = useTranslation();
  const [defs, setDefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formModal, setFormModal] = useState(null); // null | 'new' | badge def (for edit)
  const [grantModal, setGrantModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [retroLoading, setRetroLoading] = useState(null);

  const fetchDefs = async () => {
    setLoading(true);
    try {
      const { badgeDefinitions } = await gqlRequest(GET_BADGE_DEFS);
      setDefs(badgeDefinitions);
    } catch {
      toast.error('Failed to fetch badge definitions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDefs(); }, []);

  const handleSaved = (def, type) => {
    if (type === 'create') {
      setDefs(prev => [...prev, def]);
    } else {
      setDefs(prev => prev.map(d => d.id === def.id ? def : d));
    }
    toast.success(type === 'create' ? `Badge "${def.label}" created` : `Badge "${def.label}" updated`);
  };

  const handleDelete = async (def) => {
    if (!window.confirm(`Delete badge "${def.label}"? This cannot be undone.`)) return;
    try {
      await gqlRequest(DELETE_BADGE, { id: def.id });
      setDefs(prev => prev.filter(d => d.id !== def.id));
      toast.success(`Deleted "${def.label}"`);
    } catch (e) {
      toast.error(e.message || 'Failed to delete badge');
    }
    setDeleteTarget(null);
  };

  const handleRetroactive = async (badgeId) => {
    setRetroLoading(badgeId);
    try {
      const { adminRetroactiveScan: result } = await gqlRequest(RETROACTIVE, { badgeId });
      if (result.error) throw new Error(result.error);
      toast.success(`Scan complete: granted to ${result.granted.toLocaleString()} / ${result.scanned.toLocaleString()} users`);
      fetchDefs(); // refresh holder counts
    } catch (e) {
      toast.error(e.message || 'Retroactive scan failed');
    } finally {
      setRetroLoading(null);
    }
  };

  const filtered = search
    ? defs.filter(d =>
        d.label.toLowerCase().includes(search.toLowerCase()) ||
        d.id.toLowerCase().includes(search.toLowerCase()) ||
        d.description.toLowerCase().includes(search.toLowerCase())
      )
    : defs;

  const builtins = filtered.filter(d => d.isBuiltin);
  const custom = filtered.filter(d => !d.isBuiltin);

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600 pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl placeholder:text-zinc-700 focus:border-primary/40 focus:outline-none text-zinc-300"
            placeholder="Search badges..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={fetchDefs}
          className="size-8 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => setFormModal('new')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-zinc-950 text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" />
          New Badge
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Badges', value: defs.length },
          { label: 'Built-in',     value: defs.filter(d => d.isBuiltin).length },
          { label: 'Custom',       value: defs.filter(d => !d.isBuiltin).length },
        ].map(stat => (
          <div key={stat.label} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50 text-center">
            <p className="text-lg font-bold text-zinc-200">{stat.value}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Custom badges first */}
          {custom.length > 0 && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">Custom Badges</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <AnimatePresence>
                  {custom.map(def => (
                    <BadgeCard
                      key={def.id}
                      def={def}
                      onEdit={d => setFormModal(d)}
                      onDelete={handleDelete}
                      onRetroactive={handleRetroactive}
                      onGrant={d => setGrantModal(d)}
                      retroLoading={retroLoading}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Built-in badges */}
          {builtins.length > 0 && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">Built-in Badges</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <AnimatePresence>
                  {builtins.map(def => (
                    <BadgeCard
                      key={def.id}
                      def={def}
                      onEdit={d => setFormModal(d)}
                      onDelete={handleDelete}
                      onRetroactive={handleRetroactive}
                      onGrant={d => setGrantModal(d)}
                      retroLoading={retroLoading}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="text-4xl opacity-20">🏅</span>
              <p className="text-sm text-zinc-500">{search ? 'No badges match your search' : 'No badge definitions yet'}</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {formModal && (
          <BadgeFormModal
            editing={formModal === 'new' ? null : formModal}
            onClose={() => setFormModal(null)}
            onSaved={handleSaved}
          />
        )}
        {grantModal && (
          <GrantModal badge={grantModal} onClose={() => setGrantModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
