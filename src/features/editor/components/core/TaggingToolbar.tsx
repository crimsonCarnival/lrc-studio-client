import { useState, useEffect, useMemo } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { SECTION_TYPES } from '@features/editor/constants/sectionTypes';
import { applyTagToSelection } from '@features/editor/utils/sections';
import { SINGER_GRADIENT_STOPS, singerColorIndex } from '@features/editor/utils/singer-colors';
import type { EditorLine } from '@features/editor/services/editor.service';

const STANDARD_TYPES = SECTION_TYPES.filter(s => s.depth !== 0);
const STANDARD_IDS = new Set(STANDARD_TYPES.map(s => s.id));

function resolvePreset(val: string | undefined | null): string | null {
  if (!val) return null;
  const lower = val.trim().toLowerCase();
  if (STANDARD_IDS.has(lower)) return lower;
  const m = lower.match(/^(.+?)\s+\d+$/);
  if (m && STANDARD_IDS.has(m[1])) return m[1];
  return null;
}

interface TaggingToolbarProps {
  lines: EditorLine[];
  setLines: (updater: (prev: EditorLine[]) => EditorLine[]) => void;
  selectedLines: Set<number>;
  songArtists?: string[];
  clearSelection: () => void;
}

export default function TaggingToolbar({ lines, setLines, selectedLines, songArtists = [], clearSelection }: TaggingToolbarProps) {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tk = t as (key: string, defaultValue?: string, options?: any) => string;

  const [singerInput, setSingerInput] = useState('');

  // Compute common state for the current selection
  const selectionState = useMemo(() => {
    if (selectedLines.size === 0) return { section: null, singers: [] as string[] };
    let commonSection: string | undefined | null = undefined;
    let commonSingers: string[] | undefined | null = undefined;
    
    let currentParentSection: { label: string | undefined, singers: string[] | undefined } | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.type === 'section') {
        currentParentSection = { label: line.label, singers: line.singers };
      } else if (selectedLines.has(i)) {
        const sec = currentParentSection?.label || '';
        const sin = currentParentSection?.singers || [];
        
        if (commonSection === undefined) commonSection = sec;
        else if (commonSection !== sec) commonSection = null;
        
        if (commonSingers === undefined) commonSingers = sin;
        else if (JSON.stringify(commonSingers) !== JSON.stringify(sin)) commonSingers = null;
      }
    }
    return { section: commonSection, singers: commonSingers || [] };
  }, [lines, selectedLines]);

  const activePreset = resolvePreset(selectionState.section);

  const applySection = (label: string) => {
    setLines(prev => applyTagToSelection(prev, selectedLines, { label }));
  };

  const applySingers = (singers: string[]) => {
    setLines(prev => applyTagToSelection(prev, selectedLines, { singers }));
  };

  const handleAddSinger = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = selectionState.singers || [];
    if (!current.includes(trimmed)) {
      applySingers([...current, trimmed]);
    }
    setSingerInput('');
  };

  const handleRemoveSinger = (name: string) => {
    const current = selectionState.singers || [];
    applySingers(current.filter(s => s !== name));
  };

  // Keyboard shortcuts 1-7 for sections when toolbar is active
  useEffect(() => {
    if (selectedLines.size === 0) return;
    
    const handler = (e: globalThis.KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = e.key;
      if (key >= '1' && key <= '7') {
        const idx = parseInt(key) - 1;
        if (idx < STANDARD_TYPES.length) {
          e.preventDefault();
          applySection(STANDARD_TYPES[idx].id);
        }
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedLines, applySection]);

  const hasSections = lines.some(l => l.type === 'section');

  if (selectedLines.size === 0) {
    if (hasSections) return null;
    return (
      <div className="flex items-center justify-center px-4 py-2 mb-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-zinc-500 text-sm h-[52px]">
        {t('editor.tagging.selectLinesPrompt', 'Select lines to apply sections or singers')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2 mb-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-1">
        <span>{tk('editor.tagging.taggingNLines', 'Tagging {{count}} line(s)', { count: selectedLines.size })}</span>
        <button onClick={clearSelection} className="hover:text-zinc-200 transition-colors">
          <Icon name="close" size={14} />
        </button>
      </div>
      
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Sections */}
        <div className="flex flex-wrap gap-1 items-center">
          {STANDARD_TYPES.map((s, idx) => {
            const isActive = activePreset === s.id;
            return (
              <button
                key={s.id}
                onClick={() => applySection(s.id)}
                className={`h-7 px-3 text-[13px] rounded-[14px] border transition-colors flex items-center gap-1.5 cursor-pointer
                  ${isActive 
                    ? 'bg-primary/20 border-primary/60 text-primary' 
                    : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100'
                  }`}
              >
                <span>{tk(s.labelKey, s.id)}</span>
                <span className={`text-[10px] opacity-50 ${isActive ? 'text-primary' : 'text-zinc-500'}`}>{idx + 1}</span>
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-zinc-700 hidden sm:block" />

        {/* Singers */}
        <div className="flex flex-wrap gap-1 items-center flex-1">
          {selectionState.singers === null ? (
            <span className="text-xs text-zinc-500 italic px-2">{t('editor.tagging.mixedSingers', 'Mixed singers')}</span>
          ) : (
            selectionState.singers.map(singer => {
              const colorIdx = singerColorIndex(singer, songArtists);
              const colorVar = SINGER_GRADIENT_STOPS[colorIdx];
              return (
                <div 
                  key={singer}
                  className="h-7 pl-3 pr-1 text-[13px] rounded-[14px] border flex items-center gap-1 bg-zinc-800"
                  style={{ borderColor: `color-mix(in srgb, ${colorVar} 30%, transparent)`, color: colorVar }}
                >
                  <span>{singer}</span>
                  <button 
                    onClick={() => handleRemoveSinger(singer)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              );
            })
          )}
          
          <div className="relative">
            <input
              type="text"
              value={singerInput}
              onChange={(e) => setSingerInput(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSinger(singerInput);
                }
              }}
              placeholder={t('editor.tagging.addSinger', 'Add singer...')}
              list="tagging-singers-list"
              className="h-7 w-32 px-3 text-[13px] rounded-[14px] border bg-zinc-800 border-zinc-600 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-primary/60 transition-colors ml-1"
            />
            {songArtists.length > 0 && (
              <datalist id="tagging-singers-list">
                {songArtists.map(a => <option key={a} value={a} />)}
              </datalist>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
