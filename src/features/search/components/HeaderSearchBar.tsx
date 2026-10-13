import { useRef, useEffect, useId, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { SearchField } from '@ui/search-field';
import { Skeleton } from '@ui/skeleton';
import { LazyImage } from '@ui/LazyImage';
import { cn } from '@/shared/utils/utils';
import { useHeaderSearch } from '../hooks/useHeaderSearch';
import { Highlight } from './Highlight';

const KEY = 'inline-grid h-[22px] min-w-[22px] place-items-center rounded-md bg-raised px-1.5 font-mono text-[11px] leading-none font-semibold text-subtle shadow-[inset_0_-2px_0_var(--hl),inset_0_0_0_1px_var(--hl)]';

type Row = {
  key: string;
  to: string;
  title: string;
  sub?: string;
  /** Trailing detail on the second line: level for users, sync type for projects. */
  meta?: string;
  image?: string | null;
  kind: 'user' | 'project';
};

function GroupLabel({ children, count }: { children: ReactNode; count: number }) {
  return (
    <div className="flex justify-between px-3.5 pt-3 pb-1.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">
      <span>{children}</span>
      <span>{count}</span>
    </div>
  );
}

export function HeaderSearchBar({ autoFocus = false, onClose }: { autoFocus?: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  // Indexed placeholder key not present in typed resources.
  const tk = t as (key: string) => string;
  const navigate = useNavigate();
  const { query, projects, users, loading, handleQueryChange, clear } = useHeaderSearch();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const userRows: Row[] = users.map((u) => ({
    key: `u-${u.id}`,
    to: `/profile/${u.accountName}`,
    title: u.displayName || u.accountName,
    sub: `@${u.accountName}`,
    meta: u.level ? t('settings.levelShort', { level: u.level }) : undefined,
    image: u.avatarUrl,
    kind: 'user',
  }));
  const projectRows: Row[] = projects.map((p) => ({
    key: `p-${p.id}`,
    to: `/project/${p.publicId}`,
    title: p.metadata?.songName || p.title || t('library.untitled'),
    sub: p.metadata?.songArtist ?? undefined,
    meta: t(p.hasWordSync ? 'search.wordSync' : 'search.lineSync'),
    image: p.coverImage,
    kind: 'project',
  }));
  const rows = [...userRows, ...projectRows];

  // The first row is active by default so Enter opens the best match; Shift+Enter (or the
  // footer link) is the way to the full results page. Tracked by key, not index, so the
  // highlight follows a row when a refetch reorders the list.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeIndex = Math.max(0, rows.findIndex((r) => r.key === activeKey));
  const active = rows[activeIndex];

  useEffect(() => {
    if (autoFocus) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [autoFocus]);

  const trimmed = query.trim();
  const showDropdown = open && trimmed.length > 0;

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const close = () => {
    setOpen(false);
    inputRef.current?.blur();
    onClose?.();
  };

  const goToAll = () => {
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    clear();
    close();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!showDropdown || rows.length === 0) return;
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActiveKey(rows[(activeIndex + step + rows.length) % rows.length].key);
    } else if (e.key === 'Enter' && trimmed) {
      if (e.shiftKey || !active || !showDropdown) {
        goToAll();
      } else {
        navigate(active.to);
        close();
      }
    }
  };

  const renderRow = (row: Row) => {
    const isActive = row.key === active?.key;
    return (
      <Link
        key={row.key}
        id={`${listId}-${row.key}`}
        role="option"
        aria-selected={isActive}
        // Options are driven from the input (aria-activedescendant), so they stay out of the tab order.
        tabIndex={-1}
        to={row.to}
        onClick={() => setOpen(false)}
        onMouseEnter={() => setActiveKey(row.key)}
        className={cn('mx-1.5 flex min-h-[52px] items-center gap-3 rounded-[10px] px-2.5 py-1.5 text-foreground', isActive && 'bg-primary-soft')}
      >
        {row.kind === 'user' ? (
          <span className="grid size-[34px] shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft font-heading text-sm font-bold text-primary-ink uppercase">
            {row.image ? <LazyImage src={row.image} alt="" className="size-full object-cover" /> : row.title.charAt(0)}
          </span>
        ) : (
          <span className="cover-hatch grid size-[38px] shrink-0 place-items-center overflow-hidden rounded-lg text-faint">
            {row.image ? <LazyImage src={row.image} alt="" className="size-full object-cover" /> : <Icon name="music_note" size={16} />}
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate text-base leading-tight font-semibold"><Highlight text={row.title} query={trimmed} /></span>
          {(row.sub || row.meta) && (
            <span className={cn('truncate text-subtle', row.kind === 'user' ? 'font-mono text-xs font-medium' : 'text-[13px]')}>
              {row.sub && (row.kind === 'user' ? <Highlight text={row.sub} query={trimmed} /> : row.sub)}
              {row.sub && row.meta && ' · '}
              {row.meta}
            </span>
          )}
        </span>
        <kbd aria-hidden className={cn(KEY, 'ml-auto shrink-0 coarse:hidden', !isActive && 'opacity-0')}>↵</kbd>
      </Link>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      {/* "fallback": a page's own search box takes "/" first. */}
      <SearchField
        compact
        focusShortcut="fallback"
        ref={inputRef}
        value={query}
        onValueChange={(value) => { handleQueryChange(value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        label={t('search.title')}
        placeholder={tk('search.placeholder.0')}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showDropdown && active ? `${listId}-${active.key}` : undefined}
        className="h-9"
      />

      {showDropdown && (
        <div className="absolute top-full right-0 z-[200] mt-1.5 flex w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl bg-background shadow-elevated inset-ring inset-ring-hl">
          {rows.length > 0 ? (
            <div id={listId} role="listbox" aria-label={t('search.results')} className="flex flex-col pb-1.5">
              {userRows.length > 0 && <GroupLabel count={userRows.length}>{t('search.tabs.users')}</GroupLabel>}
              {userRows.map(renderRow)}
              {projectRows.length > 0 && <GroupLabel count={projectRows.length}>{t('search.tabs.projects')}</GroupLabel>}
              {projectRows.map(renderRow)}
            </div>
          ) : loading ? (
            // A skeleton in the shape of the rows, so the panel does not jump when they land.
            <div id={listId} aria-busy="true" aria-label={t('search.loading')} className="flex flex-col px-1.5 pt-2 pb-2.5">
              <div className="flex items-center gap-3 px-2.5 py-2">
                <Skeleton className="size-[34px] rounded-full" />
                <div className="flex flex-col gap-1.5"><Skeleton className="h-3 w-36 rounded-md" /><Skeleton className="h-2.5 w-24 rounded-md" /></div>
              </div>
              <div className="flex items-center gap-3 px-2.5 py-2">
                <Skeleton className="size-[38px] rounded-lg" />
                <div className="flex flex-col gap-1.5"><Skeleton className="h-3 w-44 rounded-md" /><Skeleton className="h-2.5 w-28 rounded-md" /></div>
              </div>
            </div>
          ) : (
            <div id={listId} className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
              <Icon name="search_off" size={28} className="text-faint" />
              <span className="text-base font-semibold text-foreground">{t('search.noQuick')}</span>
              <span className="text-sm text-subtle">{t('search.noQuickHint')}</span>
            </div>
          )}

          <button
            type="button"
            onClick={goToAll}
            className="flex items-center justify-between gap-3 border-t border-hl px-4 py-3 text-left text-[15px] font-semibold text-primary-ink transition-colors duration-[var(--duration-state)] hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
          >
            <span className="truncate">{t('search.allResultsFor', { query: trimmed })}</span>
            <span aria-hidden className="flex shrink-0 items-center gap-1 coarse:hidden"><kbd className={KEY}>⇧</kbd><kbd className={KEY}>↵</kbd></span>
          </button>
          {/* Keyboard legend: meaningless without a physical keyboard. */}
          <div aria-hidden className="flex gap-3.5 px-4 pt-2 pb-3 font-mono text-[11px] font-medium text-subtle coarse:hidden">
            <span>↑↓ {t('search.hintMove')}</span>
            <span>↵ {t('search.hintOpen')}</span>
            <span>esc {t('search.hintClose')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
