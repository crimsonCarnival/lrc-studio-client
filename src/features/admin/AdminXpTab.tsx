import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Icon } from '@/shared/ui/Icon';
import { gqlRequest } from '@/app/graphql.client';
import { LogoLoader } from '@ui/LogoLoader';
import { Button } from '@ui/button';
import { useAdminSub } from './admin-nav';
import { AdminSubNav } from './AdminSubNav';

interface AdminXpTabProps {
  onAdjustXP: (action: string, amount: number, target: string, userId?: string, userIds?: string[]) => Promise<void>;
}

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_XP_CURVE = /* GraphQL */ `
  query AdminXpLevelCurve($maxLevel: Int) {
    xpLevelCurve(maxLevel: $maxLevel) {
      level
      xpRequired
      xpToNext
      showcaseSlots
    }
  }
`;

interface XpLevelThreshold {
  level: number;
  xpRequired: number;
  xpToNext: number;
  showcaseSlots: number;
}

/** The most levels the server returns (it clamps to 1..200); they are fetched once and paged here. */
const CURVE_FETCH_LEVELS = 200;
const CURVE_PAGE_SIZE = 20;

export default function AdminXpTab({ onAdjustXP }: AdminXpTabProps) {
  const { t, i18n } = useTranslation();
  const [xpBulkAmount, setXpBulkAmount] = useState('500');
  const [xpBulkTarget, setXpBulkTarget] = useState('all'); // 'all' | 'ids'
  const [xpBulkIds, setXpBulkIds] = useState(''); // comma-separated usernames/ids
  const [xpBulkSaving, setXpBulkSaving] = useState(false);

  const [curve, setCurve] = useState<XpLevelThreshold[]>([]);
  const [curvePage, setCurvePage] = useState(0);
  const [curveLoading, setCurveLoading] = useState(true);
  const [curveFailed, setCurveFailed] = useState(false);

  const fetchCurve = useCallback(async () => {
    setCurveLoading(true);
    setCurveFailed(false);
    try {
      const { xpLevelCurve } = await gqlRequest(GET_XP_CURVE, { maxLevel: CURVE_FETCH_LEVELS }) as { xpLevelCurve: XpLevelThreshold[] };
      setCurve([...xpLevelCurve].sort((a, b) => a.level - b.level));
    } catch {
      setCurveFailed(true);
    } finally {
      setCurveLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCurve();
  }, [fetchCurve]);

  // Locale-aware grouping separators; i18n.language changes must re-format.
  const fmt = (n: number) => n.toLocaleString(i18n.language);

  const handleBulkXP = async (action: string) => {
    const amount = Number(xpBulkAmount);
    if (!amount || amount <= 0) { toast.error(t('admin.xp.enterValidAmount')); return; }
    setXpBulkSaving(true);
    try {
      if (xpBulkTarget === 'all') {
        await onAdjustXP(action, amount, 'all');
      } else {
        const ids = xpBulkIds.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        if (!ids.length) { toast.error(t('admin.xp.enterUserIds')); setXpBulkSaving(false); return; }
        await onAdjustXP(action, amount, 'users', undefined, ids);
      }
    } finally {
      setXpBulkSaving(false);
    }
  };

  const view = useAdminSub('xp');
  const pageCount = Math.max(1, Math.ceil(curve.length / CURVE_PAGE_SIZE));
  const page = Math.min(curvePage, pageCount - 1);
  const pageRows = curve.slice(page * CURVE_PAGE_SIZE, (page + 1) * CURVE_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <AdminSubNav
        tab="xp"
        current={view}
        items={[
          { id: 'grant', icon: 'auto_awesome', label: t('admin.xp.tabs.grant') },
          { id: 'levels', icon: 'stairs', label: t('admin.xp.tabs.levels') },
        ]}
      />

      {view === 'grant' && <>
      {/* Header */}
      <div className="flex flex-col gap-1 max-w-xl">
        <div className="flex items-center gap-2">
          <Icon name="auto_awesome" size={16} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-200">{t('admin.xp.sectionTitle')}</h2>
        </div>
        <p className="text-xs text-zinc-500">{t('admin.xp.sectionDescription')}</p>
      </div>

      {/* Controls card */}
      <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col gap-4 max-w-xl">
        {/* Amount + Target row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('admin.xp.amount')}</span>
            <input
              type="number"
              min={1}
              value={xpBulkAmount}
              onChange={e => setXpBulkAmount(e.target.value)}
              className="w-28 h-9 px-3 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500/50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('admin.xp.target')}</span>
            <select
              value={xpBulkTarget}
              onChange={e => setXpBulkTarget(e.target.value)}
              className="h-9 px-3 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">{t('admin.xp.allUsers')}</option>
              <option value="ids">{t('admin.xp.specificUsers')}</option>
            </select>
          </label>
        </div>

        {/* User IDs input — shown only for specific-users target */}
        {xpBulkTarget === 'ids' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('admin.xp.userIds')}</span>
            <input
              type="text"
              value={xpBulkIds}
              onChange={e => setXpBulkIds(e.target.value)}
              placeholder={t('admin.xp.accountNamePlaceholder')}
              className="h-9 px-3 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
            />
          </label>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleBulkXP('grant')}
            disabled={xpBulkSaving}
            className="bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
          >
            <Icon name="auto_awesome" size={14} />
            {t('admin.xp.grantXp')}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={() => handleBulkXP('revoke')}
            disabled={xpBulkSaving}
          >
            {t('admin.xp.revokeXp')}
          </Button>
          {xpBulkSaving && (
            <LogoLoader size={16} className="self-center" />
          )}
        </div>
      </div>

      </>}

      {/* Level requirement curve */}
      {view === 'levels' && <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col gap-4 max-w-3xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Icon name="stairs" size={16} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-200">{t('admin.xp.curve.title')}</h2>
          </div>
          <p className="text-xs text-zinc-500">{t('admin.xp.curve.description')}</p>
        </div>

        {curveLoading ? (
          <div className="flex items-center justify-center py-16">
            <LogoLoader size={32} />
          </div>
        ) : curveFailed ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-xs text-zinc-400">{t('admin.xp.curve.fetchError')}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fetchCurve()}
            >
              <Icon name="refresh" size={14} />
              {t('admin.xp.curve.retry')}
            </Button>
          </div>
        ) : curve.length === 0 ? (
          <p className="py-12 text-center text-xs text-zinc-500">{t('admin.xp.curve.empty')}</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-zinc-800/60">
              <table className="w-full min-w-[26rem] text-sm border-collapse">
                <caption className="sr-only">{t('admin.xp.curve.title')}</caption>
                <thead>
                  <tr className="bg-zinc-900/80">
                    <th scope="col" className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {t('admin.xp.curve.colLevel')}
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {t('admin.xp.curve.colXpRequired')}
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {t('admin.xp.curve.colXpToNext')}
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {t('admin.xp.curve.colShowcaseSlots')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(row => (
                    <tr key={row.level} className="border-t border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                      <th scope="row" className="px-3 py-1.5 text-left font-semibold text-zinc-300 tabular-nums">
                        {fmt(row.level)}
                      </th>
                      <td className="px-3 py-1.5 text-right text-zinc-400 tabular-nums">{fmt(row.xpRequired)}</td>
                      <td className="px-3 py-1.5 text-right text-zinc-400 tabular-nums">{fmt(row.xpToNext)}</td>
                      <td className="px-3 py-1.5 text-right text-zinc-400 tabular-nums">{fmt(row.showcaseSlots)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">
                {t('admin.xp.levelsRange', { from: pageRows[0]?.level ?? 0, to: pageRows[pageRows.length - 1]?.level ?? 0 })}
                {' · '}
                {t('admin.xp.curve.shownCount', { total: curve.length })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={page === 0}
                  onClick={() => setCurvePage(page - 1)}
                  aria-label={t('admin.xp.levelsPrev')}
                >
                  <Icon name="chevron_left" size={16} />
                </Button>
                <span className="min-w-12 text-center text-xs tabular-nums text-zinc-400">{page + 1} / {pageCount}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={page >= pageCount - 1}
                  onClick={() => setCurvePage(page + 1)}
                  aria-label={t('admin.xp.levelsNext')}
                >
                  <Icon name="chevron_right" size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>}
    </div>
  );
}
