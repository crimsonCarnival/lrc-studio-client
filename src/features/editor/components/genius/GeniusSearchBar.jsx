import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@ui/input';
import { Loader2, Search, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { genius } from '@features/editor/services/genius.service';
import GeniusResultCard from './GeniusResultCard';
import GeniusLyricsModal from './GeniusLyricsModal';

export default function GeniusSearchBar({ onImport, autoSearch, showKeepTimestamps }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [lyrics, setLyrics] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [keepTimestamps, setKeepTimestamps] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (term) => {
    if (!term.trim()) return;
    clearTimeout(debounceRef.current);
    setIsSearching(true);
    try {
      const data = await genius.search(term.trim());
      setResults(data.results);
    } catch (err) {
      if (err.status === 429) {
        toast.error(t('genius.error.rateLimited'));
      } else {
        toast.error(t('genius.error.generic'));
      }
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [t]);

  useEffect(() => {
    if (!autoSearch?.q) return;
    setQuery(autoSearch.q);
    doSearch(autoSearch.q);
  }, [autoSearch, doSearch]); // new object reference on each button click

  const handleQueryChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults(null);
      return;
    }

    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }, [doSearch]);

  const handleSelectSong = useCallback(async (song) => {
    setSelectedSong(song);
    setLyrics(null);
    setExtractError(null);
    setIsExtracting(true);

    try {
      const data = await genius.extract(song.url, song.title, song.artist);
      setLyrics(data.lyrics);
    } catch (err) {
      if (err.status === 429) {
        setExtractError(t('genius.error.rateLimited'));
      } else if (err.status === 422) {
        setExtractError(t('genius.error.lyricsUnavailable'));
      } else {
        setExtractError(t('genius.error.generic'));
      }
    } finally {
      setIsExtracting(false);
    }
  }, [t]);

  const handleConfirm = useCallback((lyricsText) => {
    onImport(lyricsText, keepTimestamps);
    setSelectedSong(null);
    setLyrics(null);
    setQuery('');
    setResults(null);
    setKeepTimestamps(false);
  }, [onImport, keepTimestamps]);

  const handleCloseModal = useCallback(() => {
    setSelectedSong(null);
    setLyrics(null);
    setExtractError(null);
    setKeepTimestamps(false);
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full">
      {!selectedSong && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none" />
          <Input
            value={query}
            onChange={handleQueryChange}
            placeholder={t('genius.searchPlaceholder')}
            className="pl-8 lg:pl-8 pr-8 lg:pr-8 bg-zinc-900 border-zinc-700"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 animate-spin pointer-events-none" />
          )}
        </div>
      )}

      {results !== null && !selectedSong && (
        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">{t('genius.noResults')}</p>
          ) : (
            results.map((song) => (
              <GeniusResultCard
                key={song.id}
                song={song}
                onClick={handleSelectSong}
                isLoading={isExtracting && selectedSong?.id === song.id}
              />
            ))
          )}
        </div>
      )}

      {selectedSong && (
        <GeniusLyricsModal
          song={selectedSong}
          lyrics={lyrics}
          isLoading={isExtracting}
          error={extractError}
          onConfirm={handleConfirm}
          onClose={handleCloseModal}
          keepTimestamps={keepTimestamps}
          onKeepTimestampsChange={setKeepTimestamps}
          showKeepTimestamps={showKeepTimestamps}
        />
      )}
    </div>
  );
}
