import { useState, useRef, useCallback, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@ui/input';
import { Icon } from '@/shared/ui/Icon';
import toast from 'react-hot-toast';
import { lyricsSearch } from '@features/editor/services/lyrics-search.service';
import type { LyricsSearchHit, LyricsExtractResult } from '@features/editor/services/lyrics-search.service';
import LyricsResultCard from './LyricsResultCard';
import LyricsModal from './LyricsModal';
import { useSettings } from '@/features/settings/useSettings';
import { LogoLoader } from '@ui/LogoLoader';

type SongResult = LyricsSearchHit;

interface LyricsSearchBarProps {
  onImport: (lyricsText: string, keepTimestamps: boolean) => void;
  autoSearch?: { q?: string } | null;
  showKeepTimestamps?: boolean;
  /** Loaded media length in seconds. Sent to the server to disambiguate covers/remasters/live cuts. */
  mediaDuration?: number | null;
}

export default function LyricsSearchBar({ onImport, autoSearch, showKeepTimestamps, mediaDuration }: LyricsSearchBarProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongResult | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<LyricsExtractResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [keepTimestamps, setKeepTimestamps] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSearching(true);
    try {
      const data = await lyricsSearch.search(term.trim());
      setResults(data.results);
    } catch (e) {
      const err = e as { status?: number };
      if (err.status === 429) {
        toast.error(t('lyricsSearch.error.rateLimited'));
      } else {
        toast.error(t('lyricsSearch.error.generic'));
      }
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [t]);

  useEffect(() => {
    if (!autoSearch?.q) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(autoSearch.q);
    doSearch(autoSearch.q);
  }, [autoSearch, doSearch]); // new object reference on each button click

  const handleQueryChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults(null);
      return;
    }

    const speed = settings.editor?.lyricsSearchSpeed ?? 'normal';
    const debounceMs = ({ fast: 150, normal: 300, slow: 500 } as Record<string, number>)[speed] || 300;

    debounceRef.current = setTimeout(() => doSearch(value), debounceMs);
  }, [doSearch, settings.editor?.lyricsSearchSpeed]);

  const handleSelectSong = useCallback(async (song: SongResult) => {
    setSelectedSong(song);
    setLyrics(null);
    setExtracted(null);
    setExtractError(null);
    setIsExtracting(true);

    try {
      const data = await lyricsSearch.extract(song.title, song.artist, {
        id: song.id,
        album: song.album,
        // The hit's own duration is the better signal when present (it describes
        // the specific recording); fall back to whatever media is loaded.
        duration: song.duration ?? mediaDuration,
      });
      setLyrics(data.lyrics);
      setExtracted(data);
      // Timed lyrics arrived — keeping them is the only sensible default. The
      // user can still untick to import as plain text.
      if (data.synced) setKeepTimestamps(true);
    } catch (e) {
      const err = e as { status?: number };
      if (err.status === 429) {
        setExtractError(t('lyricsSearch.error.rateLimited'));
      } else if (err.status === 422) {
        setExtractError(t('lyricsSearch.error.lyricsUnavailable'));
      } else {
        setExtractError(t('lyricsSearch.error.generic'));
      }
    } finally {
      setIsExtracting(false);
    }
  }, [t, mediaDuration]);

  const handleConfirm = useCallback((lyricsText: string) => {
    onImport(lyricsText, keepTimestamps);
    setSelectedSong(null);
    setLyrics(null);
    setExtracted(null);
    setQuery('');
    setResults(null);
    setKeepTimestamps(false);
  }, [onImport, keepTimestamps]);

  const handleCloseModal = useCallback(() => {
    setSelectedSong(null);
    setLyrics(null);
    setExtracted(null);
    setExtractError(null);
    setKeepTimestamps(false);
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full">
      {!selectedSong && (
        <div className="relative">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <Input
            value={query}
            onChange={handleQueryChange}
            placeholder={t('lyricsSearch.searchPlaceholder')}
            className="pl-8 lg:pl-8 pr-8 lg:pr-8 bg-zinc-900 border-zinc-700"
          />
          {isSearching && (
            <LogoLoader size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          )}
        </div>
      )}

      {results !== null && !selectedSong && (
        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">{t('lyricsSearch.noResults')}</p>
          ) : (
            results.map((song) => (
              // No per-card loading state: this list unmounts as soon as a song
              // is picked, and LyricsModal opens straight into its own spinner.
              <LyricsResultCard
                key={song.id}
                song={song}
                onClick={(s) => handleSelectSong(s as SongResult)}
              />
            ))
          )}
        </div>
      )}

      {selectedSong && (
        <LyricsModal
          song={selectedSong}
          lyrics={lyrics}
          isLoading={isExtracting}
          error={extractError}
          synced={extracted?.synced}
          provider={extracted?.provider}
          onConfirm={handleConfirm}
          onClose={handleCloseModal}
          keepTimestamps={keepTimestamps}
          onKeepTimestampsChange={(c) => setKeepTimestamps(c === true)}
          showKeepTimestamps={showKeepTimestamps}
        />
      )}
    </div>
  );
}
