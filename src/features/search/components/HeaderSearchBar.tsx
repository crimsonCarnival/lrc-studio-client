import { useRef, useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import { useHeaderSearch } from '../hooks/useHeaderSearch';
import { SearchUserCard } from './SearchUserCard';
import { LazyImage } from '@ui/LazyImage';
import { Link } from 'react-router-dom';

interface SearchProject {
  id: string;
  publicId: string;
  title?: string;
  coverImage?: string;
  metadata?: { songName?: string; songArtist?: string };
}

function DropdownProjectRow({ project }: { project: SearchProject }) {
  const { publicId, title, coverImage, metadata } = project;
  const displayTitle = metadata?.songName || title || 'Untitled';
  const artist = metadata?.songArtist;
  const thumb = coverImage;

  return (
    <Link
      to={`/project/${publicId}`}
      className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800/60 rounded-lg transition-colors"
    >
      {thumb
        ? <LazyImage src={thumb} alt="" className="size-7 rounded object-cover shrink-0" />
        : <div className="size-7 rounded bg-zinc-800 shrink-0" />}
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">{displayTitle}</p>
        {artist && <p className="text-xs text-zinc-500 truncate">{artist}</p>}
      </div>
    </Link>
  );
}

export function HeaderSearchBar({ autoFocus = false, onClose }: { autoFocus?: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  // Indexed placeholder key not present in typed resources.
  const tk = t as (key: string) => string;
  const navigate = useNavigate();
  const { query, projects, users, total, loading, hasResults, handleQueryChange, clear } = useHeaderSearch();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [autoFocus]);

  const showDropdown = open && (query.trim().length > 0);

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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      onClose?.();
    }
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      inputRef.current?.blur();
      onClose?.();
    }
  };

  const goToAll = () => {
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
    clear();
    onClose?.();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 animate-spin" />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { handleQueryChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={tk('search.placeholder.0')}
          className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-zinc-900/70 border border-zinc-800/60 focus:border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none text-xs transition-colors"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-72 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-[200] overflow-hidden">
          {!hasResults && !loading && query.trim() && (
            <p className="px-3 py-4 text-xs text-zinc-500 text-center">
              {t('search.noResults', { query })}
            </p>
          )}

          {users.length > 0 && (
            <div className="pt-2 pb-1">
              <p className="px-3 pb-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                {t('search.tabs.users')}
              </p>
              {users.map((u: { id: string; [key: string]: unknown }) => (
                <div key={u.id} onClick={() => setOpen(false)}>
                  <SearchUserCard user={u as Parameters<typeof SearchUserCard>[0]['user']} compact />
                </div>
              ))}
            </div>
          )}

          {projects.length > 0 && (
            <div className={`pt-2 pb-1 ${users.length > 0 ? 'border-t border-zinc-800/60' : ''}`}>
              <p className="px-3 pb-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                {t('search.tabs.projects')}
              </p>
              {projects.map((p: SearchProject) => (
                <div key={p.id} onClick={() => setOpen(false)}>
                  <DropdownProjectRow project={p} />
                </div>
              ))}
            </div>
          )}

          {(hasResults || total > 0) && (
            <button
              onClick={goToAll}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 border-t border-zinc-800/60 text-xs font-medium text-primary hover:text-primary/80 hover:bg-zinc-900/60 transition-colors"
            >
              {t('search.allResults')}
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
