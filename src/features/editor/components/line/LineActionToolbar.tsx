import { memo, useState } from 'react';
import type { Dispatch, SetStateAction, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { Pencil, Play, ChevronLeft, ChevronRight, Plus, MoreHorizontal, User, Layers } from 'lucide-react';
import LineActionsPopover from './LineActionsPopover';
import { getSingerOptionsForSelection } from '../../utils/sections';

interface Word {
  word: string;
  [key: string]: unknown;
}

interface ToolbarLine {
  timestamp?: number | null;
  text?: string;
  secondary?: string;
  words?: Word[];
  secondaryWords?: Word[];
  translations?: unknown[];
  singers?: string[];
  [key: string]: unknown;
}

interface FocusedTimestamp {
  lineIndex: number;
  type: string;
}

interface PlayerHandle {
  seek?: (time?: number | null) => void;
  play?: () => void;
}

interface LineActionToolbarProps {
  line: ToolbarLine;
  lineIndex: number;
  isActive: boolean;
  isSynced: boolean;
  editorMode: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
  editingLineIndex: number | null;
  setEditingLineIndex: Dispatch<SetStateAction<number | null>>;
  setEditingText: (text: string) => void;
  setEditingSecondary: (s: string) => void;
  setEditingTranslations: (arr: unknown[]) => void;
  setEditingSingers: (arr: string[]) => void;
  serializeToRubyMarkup: (words?: Word[]) => string;
  handleMark: (opts: { forceAdvance?: boolean }) => void;
  playerRef?: RefObject<PlayerHandle | null>;
  shiftTime: (lineIndex: number, delta: number) => void;
  handleAddLine: (lineIndex: number) => void;
  handleClearLine: (lineIndex: number) => void;
  handleDeleteLine: (lineIndex: number) => void;
  selectedLines: Set<number>;
  isMobile?: boolean;
  onLineMenu?: (lineIndex: number, line: ToolbarLine) => void;
  stampTarget?: string;
  activeWordIndex: number;
  focusedTimestamp?: FocusedTimestamp | null;
  handleInsertSection?: (index: number) => void;
  handleMoveToSection?: (indices: number[], sectionIndex: number) => void;
  sectionLines?: ToolbarLine[];
  handleAssignSinger?: (name: string, indices: number[], slot: number) => void;
  songArtists?: string[];
}

const LineActionToolbar = memo(({
  line,
  lineIndex,
  isActive,
  isSynced,
  editorMode,
  settings,
  editingLineIndex,
  setEditingLineIndex,
  setEditingText,
  setEditingSecondary,
  setEditingTranslations,
  setEditingSingers,
  serializeToRubyMarkup,
  handleMark,
  playerRef,
  shiftTime,
  handleAddLine,
  handleClearLine,
  handleDeleteLine,
  selectedLines,
  isMobile,
  onLineMenu,
  stampTarget,
  activeWordIndex,
  focusedTimestamp,
  handleInsertSection,
  handleMoveToSection,
  sectionLines,
  handleAssignSinger,
  songArtists,
}: LineActionToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
      {/* Mark button — always visible on the active unsaved line */}
      {isActive && editingLineIndex !== lineIndex && (
        <Tip content={(() => {
          if (editorMode !== 'words' || line.timestamp == null) return t('editor.mark');
          if (stampTarget === 'secondary') {
            const secWords = line.secondaryWords ?? (line.secondary?.trim().split(/\s+/).flatMap(w => w ? [{ word: w }] : []) ?? []);
            const word = secWords[Math.max(0, Math.min(activeWordIndex, secWords.length - 1))]?.word || 'word';
            return t('editor.stampWordTip', { word, current: Math.max(0, activeWordIndex), total: secWords.length });
          }
          const priWords = line.words ?? [];
          const word = priWords[Math.max(0, Math.min(activeWordIndex, priWords.length - 1))]?.word || 'word';
          return t('editor.stampWordTip', { word, current: Math.max(0, activeWordIndex), total: priWords.length });
        })()}>
          <Button
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); handleMark({ forceAdvance: true }); }}
            className={`justify-center border font-semibold rounded-lg flex-shrink-0 text-xs shadow-md animate-in fade-in zoom-in-90 duration-200 ${editorMode === 'words' && line.timestamp != null
              ? stampTarget === 'secondary'
                ? 'bg-accent-blue/15 hover:bg-accent-blue/25 border-accent-blue/40 text-accent-blue'
                : 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/40 text-sky-400'
              : 'bg-primary/20 hover:bg-primary/30 border-primary/40 text-primary'
              }`}
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Button>
        </Tip>
      )}

      <div className="flex items-center gap-0 p-0.5 rounded-full bg-zinc-800/40 backdrop-blur-md border border-zinc-700/50 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-sm">
        {isSynced && (
          <>
            <Tip content={t('editor.jumpSync')}>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (playerRef?.current?.seek) {
                    playerRef.current.seek(line.timestamp);
                    if (playerRef.current.play) playerRef.current.play();
                  }
                }}
                className="text-zinc-500 hover:bg-primary/20 hover:text-primary"
              >
                <Play className="size-3" fill="currentColor" />
              </Button>
            </Tip>

            {selectedLines.size === 0 && (
              <>
                <Tip content={(() => {
                  const nudgeVal = settings.editor?.nudge?.default || 0.1;
                  if (focusedTimestamp?.lineIndex === lineIndex) {
                    if (editorMode === 'words' && (focusedTimestamp.type === 'word' || focusedTimestamp.type === 'secondaryWord')) return t('editor.nudgeWord', { delta: `-${nudgeVal}` });
                    if ((editorMode === 'srt' || editorMode === 'words') && focusedTimestamp.type === 'end') return t('editor.nudgeEndTime', { delta: `-${nudgeVal}` });
                  }
                  return t('editor.nudgeLine', { delta: `-${nudgeVal}` });
                })()}>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => { e.stopPropagation(); shiftTime(lineIndex, -(settings.editor?.nudge?.default || 0.1)); }}
                    className={`transition-colors ${focusedTimestamp?.lineIndex === lineIndex ? 'text-primary hover:text-primary-dim hover:bg-primary/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60'}`}
                  >
                    <ChevronLeft className="size-3" />
                  </Button>
                </Tip>
                <Tip content={(() => {
                  const nudgeVal = settings.editor?.nudge?.default || 0.1;
                  if (focusedTimestamp?.lineIndex === lineIndex) {
                    if (editorMode === 'words' && (focusedTimestamp.type === 'word' || focusedTimestamp.type === 'secondaryWord')) return t('editor.nudgeWord', { delta: `+${nudgeVal}` });
                    if ((editorMode === 'srt' || editorMode === 'words') && focusedTimestamp.type === 'end') return t('editor.nudgeEndTime', { delta: `+${nudgeVal}` });
                  }
                  return t('editor.nudgeLine', { delta: `+${nudgeVal}` });
                })()}>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => { e.stopPropagation(); shiftTime(lineIndex, settings.editor?.nudge?.default || 0.1); }}
                    className={`transition-colors ${focusedTimestamp?.lineIndex === lineIndex ? 'text-primary hover:text-primary-dim hover:bg-primary/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60'}`}
                  >
                    <ChevronRight className="size-3" />
                  </Button>
                </Tip>
                <div className="w-px h-4 bg-zinc-700/50 mx-0.5" />
                <Tip content={t('editor.addLine')}>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => { e.stopPropagation(); handleAddLine(lineIndex); }}
                    className="text-primary/70 hover:text-primary hover:bg-primary/10"
                  >
                    <Plus className="size-3" />
                  </Button>
                </Tip>
                <div className="w-px h-4 bg-zinc-700/50 mx-0.5" />
                <Tip content={t('editor.editLine')}>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLineIndex(lineIndex);
                      setEditingText(serializeToRubyMarkup(line.words) || line.text || '');
                      setEditingSecondary(line.secondary || '');
                      setEditingTranslations(line.translations ? [...line.translations] : []);
                      const lineSingers = line.singers || [];
                      setEditingSingers([...lineSingers, '', '', '', ''].slice(0, 4));
                    }}
                    className="text-sky-400/70 hover:text-sky-400 hover:bg-sky-500/10"
                  >
                    <Pencil className="size-3" />
                  </Button>
                </Tip>
              </>
            )}
          </>
        )}
        {!isSynced && selectedLines.size === 0 && (
          <Tip content={t('editor.editLine')}>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation();
                setEditingLineIndex(lineIndex);
                setEditingText(serializeToRubyMarkup(line.words) || line.text || '');
                setEditingSecondary(line.secondary || '');
                setEditingTranslations(line.translations ? [...line.translations] : []);
                const lineSingers = line.singers || [];
                setEditingSingers([...lineSingers, '', '', '', ''].slice(0, 4));
              }}
              className="text-sky-400/70 hover:text-sky-400 hover:bg-sky-500/10"
            >
              <Pencil className="size-3" />
            </Button>
          </Tip>
        )}
        {selectedLines.size === 0 && (
          <>
            <Tip content={t('editor.insertSectionAbove')}>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => { e.stopPropagation(); handleInsertSection?.(lineIndex - 1); }}
                className="text-zinc-500 hover:text-primary hover:bg-primary/10"
              >
                <Layers className="size-3" />
              </Button>
            </Tip>
            {!isMobile ? (
              <LineActionsPopover
                lineIndex={lineIndex}
                line={line}
                handleAddLine={handleAddLine}
                handleClearLine={handleClearLine}
                handleDeleteLine={handleDeleteLine}
                handleMoveToSection={handleMoveToSection}
                sectionLines={sectionLines}
              />
            ) : (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => { e.stopPropagation(); onLineMenu?.(lineIndex, line); }}
                className="text-zinc-500 active:text-zinc-300"
              >
                <MoreHorizontal className="size-3" />
              </Button>
            )}
          </>
        )}
        {selectedLines.size > 1 && selectedLines.has(lineIndex) && (
          <SingerAssignButton
            selectedLines={selectedLines}
            handleAssignSinger={handleAssignSinger}
            songArtists={getSingerOptionsForSelection((sectionLines ?? []) as unknown as Parameters<typeof getSingerOptionsForSelection>[0], [...selectedLines], songArtists)}
          />
        )}
      </div>
    </div>
  );
});

function SingerAssignButton({ selectedLines, handleAssignSinger, songArtists }: { selectedLines: Set<number>; handleAssignSinger?: (name: string, indices: number[], slot: number) => void; songArtists?: string[] }) {
  const { t } = useTranslation();
  // singerN uses a default-value string + interpolation.
  const tk = t as (key: string, defaultValue?: string, options?: Record<string, unknown>) => string;
  const [open, setOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [custom, setCustom] = useState('');
  const indices = [...selectedLines];

  if (!handleAssignSinger) return null;

  const ROLE_LABELS = [
    { label: t('editor.singer'), className: '' },
    { label: tk('editor.singerN', 'Singer {{n}}', { n: 2 }), className: 'italic' },
    { label: tk('editor.singerN', 'Singer {{n}}', { n: 3 }), className: 'font-bold' },
    { label: tk('editor.singerN', 'Singer {{n}}', { n: 4 }), className: 'font-bold italic' },
  ];

  const assignName = (name: string) => {
    // Build singers array with name at selectedSlot, others unset
    // We merge with the existing line data in the handler
    handleAssignSinger(name, indices, selectedSlot);
    setOpen(false);
    setCustom('');
  };

  return (
    <div className="relative">
      <Tip content={t('editor.assignSingerToLines', { count: indices.length })}>
        <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }} className="text-zinc-500 hover:text-primary hover:bg-primary/10">
          <User className="size-3" />
        </Button>
      </Tip>
      {open && (
        <div
          className="absolute bottom-full right-0 mb-1 w-52 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Role slot picker */}
          <div className="flex gap-1 px-2 pb-1 border-b border-zinc-800 mb-1">
            {ROLE_LABELS.map((role, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedSlot(idx)}
                className={`flex-1 py-0.5 rounded text-[10px] transition-colors ${selectedSlot === idx ? 'bg-primary/20 text-primary' : 'text-zinc-500 hover:text-zinc-300'} ${role.className}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <p className="px-3 py-0.5 text-[10px] text-zinc-600">
            {ROLE_LABELS[selectedSlot].label}
          </p>
          {(songArtists?.length ? songArtists : []).map((a) => (
            <button key={a} type="button" onClick={() => assignName(a)} className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 hover:text-primary truncate">
              {a}
            </button>
          ))}
          <div className="border-t border-zinc-800 mt-1 pt-1 px-2 flex gap-1">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) assignName(custom.trim()); }}
              placeholder={t('editor.singerCustomPlaceholder')}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-zinc-200 text-xs focus:outline-none focus:border-primary/60"
            />
            <button type="button" onClick={() => { if (custom.trim()) assignName(custom.trim()); }} className="px-2 py-1 rounded bg-primary/20 text-primary text-xs hover:bg-primary/30">✓</button>
          </div>
          <button type="button" onClick={() => { handleAssignSinger('', indices, selectedSlot); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 text-[10px]">
            {t('editor.clearSingers')}
          </button>
        </div>
      )}
    </div>
  );
}

LineActionToolbar.displayName = 'LineActionToolbar';

export default LineActionToolbar;
