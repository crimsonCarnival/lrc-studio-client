import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Dispatch, KeyboardEvent, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { SECTION_TYPES } from '@features/editor/constants/section-types';
import { applyTagToSelection } from '@features/editor/utils/sections';
import { SINGER_GRADIENT_STOPS, singerColorIndex } from '@features/editor/utils/singer-colors';
import type { EditorLine } from '@/features/editor/editor.types';
import { SuggestInput } from '@ui/suggest-input';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import { cn } from '@/shared/utils/utils';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { labelSingers } from '@/features/assist/assist.service';
import { HEAVY_LINE_LIMIT, HEAVY_LINE_MAX_CHARS, useHeavyUsage } from '@/features/assist/useHeavyUsage';
import { SingerLabelsReview } from '@/features/assist/SingerLabelsReview';
import type { SingerLabel } from '@/features/assist/assist.types';

/** The server accepts 2-12 roster names of 1-100 characters. */
const ROSTER_MIN = 2;
const ROSTER_MAX = 12;
const NAME_MAX = 100;

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
  setLines: Dispatch<SetStateAction<EditorLine[]>>;
  selectedLines: Set<number>;
  /** Hands the tag's old→new index map to useEditor's index-state remapping. */
  recordIndexMap: (indexMap: number[]) => void;
  songArtists?: string[];
  clearSelection: () => void;
  /** Writes reviewed singer suggestions (useEditor's handleApplySingerLabels). Omit to hide the suggest button. */
  onApplySingerLabels?: (labels: SingerLabel[], opened: EditorLine[]) => void;
}

export default function TaggingToolbar({ lines, setLines, selectedLines, recordIndexMap, songArtists = [], clearSelection, onApplySingerLabels }: TaggingToolbarProps) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const tk = t as (key: string, defaultValueOrOptions?: string | Record<string, unknown>) => string;

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

  // Tagging inserts/drops section markers, shifting indices. Computed from the rendered
  // `lines` (not inside a setLines updater) so its exact old→new map can be handed to
  // useEditor, which remaps the selection, active line and other index state — otherwise a
  // following Delete would hit whatever lines slid into the old indices.
  const applyTag = useCallback((tag: { label?: string; singers?: string[] }) => {
    const { lines: next, indexMap } = applyTagToSelection(lines, selectedLines, tag);
    recordIndexMap(indexMap);
    setLines(next);
  }, [lines, selectedLines, setLines, recordIndexMap]);

  const applySection = useCallback((label: string) => applyTag({ label }), [applyTag]);

  const applySingers = (singers: string[]) => applyTag({ singers });

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

  // Suggest singers (AI assist): signed-in only. Sends the selected main lines, or all of them when
  // nothing is selected. `review` holds the response with the exact lines it was computed for.
  const canSuggest = !!user && !!onApplySingerLabels;
  const heavy = useHeavyUsage(canSuggest);
  const [running, setRunning] = useState(false);
  const [review, setReview] = useState<{ labels: SingerLabel[]; opened: EditorLine[] } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const roster = useMemo(() => songArtists.filter((n) => n.length > 0 && n.length <= NAME_MAX).slice(0, ROSTER_MAX), [songArtists]);
  // Toolbar only renders with a selection, so the lines to send are the selected non-section ones.
  const suggestLines = useMemo(
    () => lines.filter((l, i) => l.type !== 'section' && selectedLines.has(i)),
    [lines, selectedLines],
  );
  const suggestLineCount = suggestLines.length;
  const suggestBlocked = roster.length < ROSTER_MIN
    ? t('editor.assist.singers.needRoster')
    : suggestLineCount === 0 ? t('editor.assist.heavy.noLines')
      : suggestLineCount > HEAVY_LINE_LIMIT ? t('editor.assist.heavy.tooLong', { max: HEAVY_LINE_LIMIT })
        : suggestLines.some((l) => (l.text ?? '').length > HEAVY_LINE_MAX_CHARS) ? t('editor.assist.heavy.lineTooLong', { max: HEAVY_LINE_MAX_CHARS })
          : heavy.exhausted ? t('editor.assist.heavy.none') : null;
  const suggestInert = suggestBlocked !== null || running;
  const suggestLabel = running
    ? t('editor.assist.singers.running')
    : heavy.usage ? t('editor.assist.singers.button', { count: heavy.usage.remaining }) : t('editor.assist.singers.label');

  const runSuggest = async () => {
    if (suggestInert) return;
    const opened = suggestLines;
    setRunning(true);
    try {
      const res = await labelSingers({ lines: opened.map((l) => l.text ?? ''), roster });
      heavy.setUsage(res.usage);
      if (mounted.current) setReview({ labels: res.labels, opened });
    } catch (err) {
      heavy.reportError(err);
    } finally {
      if (mounted.current) setRunning(false);
    }
  };

  const reviewModal = review && onApplySingerLabels ? (
    <SingerLabelsReview
      open
      onOpenChange={(open) => { if (!open) setReview(null); }}
      labels={review.labels}
      opened={review.opened}
      current={lines}
      onApply={onApplySingerLabels}
    />
  ) : null;

  const hasSections = lines.some(l => l.type === 'section');

  if (selectedLines.size === 0) {
    if (hasSections) return reviewModal;
    return (
      <>
      <div data-tour="editor-sections-banner" className="flex items-center justify-center px-4 py-2 mb-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-zinc-500 text-sm h-[52px]">
        {t('editor.tagging.selectLinesPrompt')}
      </div>
      {reviewModal}
      </>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-2 px-3 py-2 mb-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-1">
        <span>{tk('editor.tagging.taggingNLines', { count: selectedLines.size })}</span>
        <Tip content={t('common.actions.clearSelection')}>
          <button aria-label={t('common.actions.clearSelection')} onClick={clearSelection} className="hover:text-zinc-200 transition-colors">
            <Icon name="close" size={14} />
          </button>
        </Tip>
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
                className={`h-7 px-3 text-[13px] rounded-[calc(var(--radius)*1.4)] border transition-colors flex items-center gap-1.5 cursor-pointer
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
            <span className="text-xs text-zinc-500 italic px-2">{t('editor.tagging.mixedSingers')}</span>
          ) : (
            selectionState.singers.map(singer => {
              const colorIdx = singerColorIndex(singer, songArtists);
              const colorVar = SINGER_GRADIENT_STOPS[colorIdx];
              return (
                <div 
                  key={singer}
                  className="h-7 pl-3 pr-1 text-[13px] rounded-[calc(var(--radius)*1.4)] border flex items-center gap-1 bg-zinc-800"
                  style={{ borderColor: `color-mix(in srgb, ${colorVar} 30%, transparent)`, color: colorVar }}
                >
                  <span>{singer}</span>
                  <Tip content={t('common.actions.removeSinger')}>
                    <button aria-label={t('common.actions.removeSinger')} 
                      onClick={() => handleRemoveSinger(singer)}
                      className="p-1 hover:bg-white/10 rounded-pill transition-colors"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </Tip>
                </div>
              );
            })
          )}
          
          <div className="relative">
            <SuggestInput
              suggestions={songArtists}
              value={singerInput}
              onChange={(e) => setSingerInput(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSinger(singerInput);
                }
              }}
              placeholder={t('editor.addSinger')}
              className="h-7 w-32 px-3 text-[13px] rounded-[calc(var(--radius)*1.4)] border bg-zinc-800 border-zinc-600 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-primary/60 transition-colors ml-1"
            />
          </div>
          {canSuggest && (
            <div className="ml-auto">
              {/* Tip renders bare children when its content is empty, which would remount the button (and drop focus) as the block flips; always give it text. */}
              <Tip content={suggestBlocked ?? suggestLabel}>
                {/* aria-disabled, not disabled: a disabled button emits no hover, so the reason would be unreachable. */}
                <Button
                  variant="outline"
                  size="sm"
                  aria-disabled={suggestInert}
                  onClick={runSuggest}
                  className={cn('h-7 text-[13px]', suggestInert && 'opacity-50 cursor-not-allowed')}
                >
                  {suggestLabel}
                </Button>
              </Tip>
              <span role="status" className="sr-only">{running ? t('editor.assist.singers.running') : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
    {reviewModal}
    </>
  );
}
