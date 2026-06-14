import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { youtube } from '@/features/player/services/youtube.service';
import { Skeleton } from '@ui/skeleton';
import { LazyImage } from '@ui/LazyImage';

function YtIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.8 8.001a2.75 2.75 0 0 0-1.937-1.948C18.2 5.6 12 5.6 12 5.6s-6.2 0-7.863.453A2.75 2.75 0 0 0 2.2 8.001 28.8 28.8 0 0 0 1.75 12a28.8 28.8 0 0 0 .45 3.999 2.75 2.75 0 0 0 1.937 1.948C5.8 18.4 12 18.4 12 18.4s6.2 0 7.863-.453a2.75 2.75 0 0 0 1.937-1.948A28.8 28.8 0 0 0 22.25 12a28.8 28.8 0 0 0-.45-3.999ZM9.75 15V9l5.25 3-5.25 3Z" />
    </svg>
  );
}


function isYouTubeUrl(str) {
  return /(?:youtube\.com\/watch\?|youtu\.be\/)/.test(str);
}

function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

export default function YoutubeSearchPanel({ onSelect, onClose, initialQuery = '' }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [unembeddableWarning, setUnembeddableWarning] = useState(null); // { videoId, url, title }
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const userEditedRef = useRef(false);

  // Seed the search box from initialQuery (song name + artist) until the user
  // takes over the input. This component now mounts before those fields are
  // filled, so we mirror the prop instead of only reading it once at mount.
  useEffect(() => {
    if (!userEditedRef.current) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const runSearch = useCallback(async (q) => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      if (isYouTubeUrl(term)) {
        const videoId = extractVideoId(term);
        if (videoId) {
          // Pre-flight embeddability check for pasted URLs
          try {
            const { embeddable } = await youtube.checkEmbed(videoId);
            if (!embeddable) {
              setUnembeddableWarning({ videoId, url: term, title: term });
              return;
            }
          } catch { /* non-fatal — proceed */ }
          onSelect({ videoId, url: term, title: term });
          return;
        }
      }
      const data = await youtube.search(term);
      setResults(data?.results || []);
    } catch (err) {
      setError(err?.response?.data?.error || t('home.ytSearchFailed'));
    } finally {
      setLoading(false);
    }
  }, [onSelect, t]);

  const handleQueryChange = (e) => {
    const value = e.target.value;
    userEditedRef.current = true;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); setSearched(false); return; }
    debounceRef.current = setTimeout(() => runSearch(value), 400);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      runSearch(query);
    }
  };

  const handleSelect = (item) => {
    if (item.embeddable === false) {
      setUnembeddableWarning({
        videoId: item.videoId,
        url: `https://www.youtube.com/watch?v=${item.videoId}`,
        title: item.title,
      });
      return;
    }
    onSelect({
      videoId: item.videoId,
      url: `https://www.youtube.com/watch?v=${item.videoId}`,
      title: item.title,
      thumbnail: item.thumbnail,
      channelTitle: item.channelTitle,
    });
  };

  if (unembeddableWarning) {
    return (
      <div className="flex flex-col h-full animate-fade-in items-center justify-center p-6 gap-5 text-center">
        <div className="size-12 rounded-full bg-orange-500/15 flex items-center justify-center">
          <AlertTriangle className="size-6 text-orange-400" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-zinc-100">{t('player.embeddingDisabled')}</p>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
            {t('player.embeddingDisabledDesc')}
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(unembeddableWarning.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="size-3.5" />
            Find another version
          </a>
          <button
            onClick={() => setUnembeddableWarning(null)}
            className="w-full py-2 px-4 rounded-xl border border-zinc-700/50 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Search Input */}
      <div className="flex items-center gap-2 p-4 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-2 flex-1 bg-zinc-900 border border-zinc-700/60 rounded-xl px-3 py-2 focus-within:border-red-500/50 focus-within:ring-1 focus-within:ring-red-500/30 transition-all">
          <YtIcon className="size-4 text-red-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder={t('home.searchYoutubePlaceholder')}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:ring-0 focus-visible:ring-0"
          />
          {query && (
            <button aria-label={t('common.clear')} onClick={() => { if (debounceRef.current) clearTimeout(debounceRef.current); userEditedRef.current = true; setQuery(''); setResults([]); setSearched(false); }} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          aria-label={t('home.searchYoutube')}
          onClick={() => runSearch(query)}
          disabled={!query.trim() || loading}
          className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors shrink-0"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </button>
        {onClose && (
          <button aria-label={t('common.close')} onClick={onClose} className="size-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className={`flex-1 ${results.length > 0 || loading ? 'overflow-y-auto scrollbar-thin' : 'overflow-hidden'} p-4 flex flex-col`}>
        {error && (
          <div className="flex-1 flex items-center justify-center text-sm text-red-400 text-center p-8">{error}</div>
        )}

        {!loading && searched && results.length === 0 && !error && (
          <div className="flex-1 flex items-center justify-center text-sm text-zinc-500 text-center p-8">{t('home.ytNoResults')}</div>
        )}

        {!searched && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-600">
            <YtIcon className="size-10 text-red-500/30" />
            <p className="text-sm">{t('home.ytSearchPrompt')}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-32 h-[72px] rounded-lg shrink-0" />
                <div className="flex-1 flex flex-col gap-2 pt-1">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((item) => (
              <button
                key={item.videoId}
                onClick={() => handleSelect(item)}
                className="group flex gap-3 p-2 rounded-xl hover:bg-zinc-800/60 transition-all text-left w-full cursor-pointer"
              >
                <div className="relative w-32 h-[72px] shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                  {item.thumbnail && (
                    <LazyImage
                      src={item.thumbnail}
                      alt={item.title}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="size-8 rounded-full bg-red-600/90 flex items-center justify-center">
                      <svg className="size-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <p className="text-sm font-medium text-zinc-200 line-clamp-2 group-hover:text-white transition-colors leading-snug">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-zinc-500 truncate">{item.channelTitle}</p>
                    {item.embeddable === false && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle className="size-2.5" />
                        No embed
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-1">
                  <ExternalLink className="size-3.5 text-zinc-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
