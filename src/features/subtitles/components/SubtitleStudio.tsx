import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { useSettings } from '@/features/settings/useSettings';
import type { PlayerHandle } from '@/features/player/player.types';
import type { EditorLine } from '@/features/editor/editor.types';
import { ChangeMediaDialog } from '@/features/player/components/ChangeMediaDialog';
import { buildCues, buildRows, constrainCueEdit, validateCues, YOUTUBE_RULES } from '../subtitle-cues';
import { addTranslationLanguage, clearCueEnd, clearCueTimes, firstUntimedLine, markEnd, markStart, mergeCueWithNext, removeCueLine, removeTranslationLanguage, setLineTranslation, splitCueLine, studioLanguages } from '../subtitle-edits';
import type { Cue, CueIssue } from '../subtitles.types';
import { VideoStage } from './VideoStage';
import { PlayerBar } from './PlayerBar';
import { CueTimeline } from './CueTimeline';
import { CueList } from './CueList';
import { TranslationBar } from './TranslationBar';
import type { CueActions } from './CueMenu';

export type SubtitleStudioProps = {
  lines: EditorLine[];
  setLines: Dispatch<SetStateAction<EditorLine[]>>;
  duration?: number;
  playerRef: RefObject<PlayerHandle | null>;
  /** Saves the project now, as the editor's Save button does. */
  onSave: () => unknown;
  isSaving?: boolean;
};

const roundMs = (seconds: number) => Math.round(seconds * 1000) / 1000;
/**
 * The subtitle studio: the video with the cues drawn over it, every line as an editable row,
 * and a timeline to drag the timed ones on. It is the only editor a subtitle project has (a
 * song never opens here), and it edits the project's `lines`, so undo, autosave and export
 * all see its changes.
 */
export default function SubtitleStudio({ lines, setLines, duration = 0, playerRef, onSave, isSaving = false }: SubtitleStudioProps) {
  const { t } = useTranslation();
  const tx = t as (key: string, options?: Record<string, unknown>) => string;
  const { settings } = useSettings();
  const srt = settings.editor?.srt;
  // Tracked by line, not by position: retiming a cue can change its place in the order.
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [onlyIssues, setOnlyIssues] = useState(false);
  // Fullscreen is the stage covering the whole viewport, with the browser's own fullscreen
  // asked for on top. If the browser refuses, the stage still covers the page.
  const [full, setFull] = useState(false);
  const enterFull = useCallback(() => {
    setFull(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);
  const exitFull = useCallback(() => {
    setFull(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);
  const toggleFull = useCallback(() => (full ? exitFull() : enterFull()), [full, enterFull, exitFull]);
  useEffect(() => {
    if (!full) return;
    // The browser's own Esc leaves fullscreen and reports it here; without browser fullscreen it is a plain keypress.
    const onChange = () => { if (!document.fullscreenElement) setFull(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
    };
  }, [full]);
  // Leaving the studio while fullscreen must not leave the browser fullscreen.
  useEffect(() => () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }, []);

  const cues = useMemo(
    () => buildCues(lines, { duration, minGap: srt?.minSubtitleGap, defaultDuration: srt?.defaultSubtitleDuration }),
    [lines, duration, srt?.minSubtitleGap, srt?.defaultSubtitleDuration],
  );
  const rows = useMemo(() => buildRows(lines, cues), [lines, cues]);
  const lineTexts = useMemo(() => lines.map((l) => l.text ?? ''), [lines]);
  const languages = useMemo(() => studioLanguages(lines), [lines]);
  const translationTexts = useMemo(
    () => lines.map((l) => languages.map((lang) => l.translations?.[lang.index]?.text ?? '')),
    [lines, languages],
  );
  const addLanguage = useCallback((label: string) => setLines((prev) => addTranslationLanguage(prev, label)), [setLines]);
  const removeLanguage = useCallback((index: number) => setLines((prev) => removeTranslationLanguage(prev, index)), [setLines]);
  const commitTranslation = useCallback(
    (lineIndex: number, slot: number, text: string) => setLines((prev) => setLineTranslation(prev, lineIndex, slot, text)),
    [setLines],
  );

  // Ctrl or Cmd + S saves, as in the editor; the browser's own "save page" must not open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSave]);
  const [mediaOpen, setMediaOpen] = useState(false);

  const { issuesByCue, issueLines, errorCount, warningCount } = useMemo(() => {
    const byCue = new Map<number, CueIssue[]>();
    for (const issue of validateCues(cues, YOUTUBE_RULES, duration || undefined)) {
      const list = byCue.get(issue.cue);
      if (list) list.push(issue);
      else byCue.set(issue.cue, [issue]);
    }
    // A cue counts once: as "must fix" if any of its problems is an error, else "to check".
    let errors = 0;
    for (const list of byCue.values()) if (list.some((i) => i.severity === 'error')) errors++;
    return {
      issuesByCue: byCue,
      issueLines: new Set([...byCue.keys()].map((i) => cues[i].lineIndex)),
      errorCount: errors,
      warningCount: byCue.size - errors,
    };
  }, [cues, duration]);
  const problemCount = errorCount + warningCount;

  const seek = useCallback((time: number) => playerRef.current?.seek?.(time), [playerRef]);

  const selectCue = useCallback((cueIndex: number) => {
    const cue = cues[cueIndex];
    if (!cue) return;
    setSelectedLine(cue.lineIndex);
    seek(cue.start);
  }, [cues, seek]);

  // Every time edit lands here, so the rule about neighbours and the media length is one rule.
  const commitTimes = useCallback((cueIndex: number, edit: { start?: number; end?: number }) => {
    const cue = cues[cueIndex];
    if (!cue) return;
    const next = constrainCueEdit(cues, cueIndex, edit, duration || undefined);
    setLines((prev) => prev.map((l, i) => (
      i === cue.lineIndex ? { ...l, timestamp: roundMs(next.start), endTime: roundMs(next.end), source: 'manual' as const } : l
    )));
  }, [cues, duration, setLines]);

  const commitLineText = useCallback((lineIndex: number, text: string) => {
    setLines((prev) => prev.map((l, i) => (i === lineIndex ? { ...l, text } : l)));
  }, [setLines]);

  const commitText = useCallback((cueIndex: number, text: string) => {
    const cue = cues[cueIndex];
    if (cue) commitLineText(cue.lineIndex, text);
  }, [cues, commitLineText]);

  // A new line goes last and is selected, ready to be typed into and then marked.
  const addLine = useCallback(() => {
    setSelectedLine(lines.length);
    setLines((prev) => [...prev, { id: crypto.randomUUID(), text: '', timestamp: null }]);
  }, [lines.length, setLines]);

  const splitCue = useCallback((cueIndex: number) => {
    const cue = cues[cueIndex];
    const at = playerRef.current?.getCurrentTime?.();
    if (!cue || at == null) return;
    setLines((prev) => splitCueLine(prev, cue, at) ?? prev);
  }, [cues, playerRef, setLines]);

  const mergeCue = useCallback((cueIndex: number) => {
    setLines((prev) => mergeCueWithNext(prev, cues, cueIndex) ?? prev);
  }, [cues, setLines]);

  // Stamping takes the player's own clock, read when pressed rather than on every tick.
  const stampEdge = useCallback((cueIndex: number, edge: 'start' | 'end') => {
    const at = playerRef.current?.getCurrentTime?.();
    if (at == null) return;
    commitTimes(cueIndex, { [edge]: at });
  }, [playerRef, commitTimes]);

  const untimedCount = useMemo(
    () => lines.filter((l) => l.type !== 'section' && l.timestamp == null && (l.text ?? '').trim() !== '').length,
    [lines],
  );
  const nextUntimed = useMemo(() => firstUntimedLine(lines), [lines]);
  const selectLine = useCallback((lineIndex: number) => setSelectedLine(lineIndex), []);

  // The mark button works in two presses: the first sets a line's start, the second its end.
  // The line waiting for its end is derived from the lines (it has a start and no end), so
  // setting the end by hand, clearing the times or deleting the line all end the wait too.
  const [markedLine, setMarkedLine] = useState<number | null>(null);
  const awaitingEnd = markedLine != null && lines[markedLine]?.timestamp != null && lines[markedLine]?.endTime == null ? markedLine : null;
  // The line the next press stamps: the one clicked in the list if it is still waiting for a
  // time, else the first such line.
  const selected = selectedLine != null ? lines[selectedLine] : undefined;
  const selectedWaits = !!selected && selected.type !== 'section' && selected.timestamp == null && (selected.text ?? '').trim() !== '';
  const markTarget = awaitingEnd == null ? (selectedWaits ? selectedLine : nextUntimed >= 0 ? nextUntimed : null) : null;
  const mark = useCallback(() => {
    const at = playerRef.current?.getCurrentTime?.();
    if (at == null) return;
    if (awaitingEnd != null) {
      setLines((prev) => markEnd(prev, awaitingEnd, at, cues, { duration: duration || undefined, minGap: srt?.minSubtitleGap }) ?? prev);
      setMarkedLine(null);
    } else if (markTarget != null) {
      setSelectedLine(markTarget);
      setMarkedLine(markTarget);
      setLines((prev) => markStart(prev, markTarget, at));
    }
  }, [playerRef, awaitingEnd, markTarget, cues, duration, srt?.minSubtitleGap, setLines]);

  const clearEnd = useCallback((cueIndex: number) => {
    const cue = cues[cueIndex];
    if (cue) setLines((prev) => clearCueEnd(prev, cue));
  }, [cues, setLines]);

  const clearTimes = useCallback((cueIndex: number) => {
    const cue = cues[cueIndex];
    if (!cue) return;
    setSelectedLine(null);
    setLines((prev) => clearCueTimes(prev, cue));
  }, [cues, setLines]);

  const removeCue = useCallback((cueIndex: number) => {
    const cue = cues[cueIndex];
    if (!cue) return;
    setSelectedLine(null);
    setLines((prev) => removeCueLine(prev, cue));
  }, [cues, setLines]);

  const cueActions = useMemo<CueActions>(
    () => ({ onStamp: stampEdge, onSplit: splitCue, onMerge: mergeCue, onClearEnd: clearEnd, onClearTimes: clearTimes, onRemove: removeCue }),
    [stampEdge, splitCue, mergeCue, clearEnd, clearTimes, removeCue],
  );

  // One chip says where the file stands and, when something is wrong, filters the list to it.
  const chip = errorCount > 0
    ? { tone: 'border-destructive/50 bg-destructive/10 text-destructive', icon: 'error', label: tx('editor.studio.chipFix', { count: errorCount }) }
    : warningCount > 0
      ? { tone: 'border-warning/45 bg-warning/10 text-warning-dim dark:text-warning', icon: 'warning', label: tx('editor.studio.chipCheck', { count: warningCount }) }
      : { tone: 'border-zinc-700 bg-transparent text-foreground', icon: 'check', label: t('editor.studio.chipReady') };

  return (
    <>
      {/* The stage, list and timeline need the width, so a phone gets this note and the export. */}
      <div className="lg:hidden flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="grid size-[72px] place-items-center rounded-[20px] border border-zinc-800 bg-zinc-900 text-primary">
          <Icon name="subtitles" size={34} />
        </div>
        <h1 className="m-0 font-heading text-[22px] font-bold leading-tight text-foreground">{t('editor.studio.desktopTitle')}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-foreground/65">{t('editor.studio.desktopOnly')}</p>
        <div className="flex w-full flex-col gap-2.5">
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent('preview:open-export'))}
            disabled={cues.length === 0}
            className="h-12 gap-2 rounded-[calc(var(--radius)*1)] border-zinc-700 bg-transparent text-[15px] font-semibold text-foreground"
          >
            <Icon name="download" size={18} />
            {t('editor.studio.export')}
          </Button>
        </div>
        <p className="m-0 text-[13px] leading-relaxed text-foreground/65">{t('editor.studio.desktopNote')}</p>
      </div>

      <div className="max-lg:hidden flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-2.5">
          <h1 className="m-0 min-w-0 truncate font-heading text-lg font-bold text-foreground">{t('editor.studio.title')}</h1>
          <div className="flex items-center gap-2.5">
            {cues.length > 0 && (
              <button
                type="button"
                aria-pressed={onlyIssues}
                disabled={problemCount === 0}
                title={t('editor.studio.chipHint')}
                onClick={() => setOnlyIssues((v) => !v)}
                className={`flex h-11 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${chip.tone} ${onlyIssues ? 'ring-2 ring-primary/50' : ''} disabled:cursor-default`}
              >
                <Icon name={chip.icon} size={16} />
                {chip.label}
              </button>
            )}
            <Button
              variant="outline"
              onClick={() => void onSave()}
              disabled={isSaving}
              className="h-11 gap-2 rounded-[calc(var(--radius)*1)] border-zinc-700 bg-transparent px-3.5 text-[13px] font-semibold text-foreground"
            >
              <Icon name="save" size={16} />
              {isSaving ? t('project.saving') : t('project.save')}
            </Button>
            <Button
              onClick={() => window.dispatchEvent(new CustomEvent('preview:open-export'))}
              disabled={cues.length === 0}
              className="h-11 gap-2 rounded-[calc(var(--radius)*1)] bg-primary px-[18px] text-[13px] font-bold text-zinc-950 hover:bg-primary-dim"
            >
              <Icon name="download" size={16} />
              {t('editor.studio.export')}
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(420px,2fr)]">
          <div className="flex min-h-0 min-w-0 flex-col justify-center gap-4 p-5">
            <VideoStage cues={cues} full={full} onToggleFull={toggleFull} onChooseMedia={() => setMediaOpen(true)} controls={<PlayerBar cues={cues} full={full} onToggleFull={toggleFull} />} />
            {!full && <PlayerBar cues={cues} full={full} onToggleFull={toggleFull} />}
          </div>
          <div className="flex min-h-0 flex-col border-l border-zinc-800">
            <div className="flex items-center justify-between gap-3 px-4 pb-2.5 pt-3.5">
              <h2 className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">{tx('editor.studio.listTitle', { count: cues.length })}</h2>
              <div role="group" aria-label={t('editor.studio.filterLabel')} className="flex gap-1 rounded-[10px] bg-zinc-900 p-[3px]">
                <button
                  type="button"
                  aria-pressed={!onlyIssues}
                  onClick={() => setOnlyIssues(false)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${!onlyIssues ? 'bg-zinc-700 text-foreground' : 'text-foreground/65 hover:text-foreground'}`}
                >
                  {t('editor.studio.filterAll')}
                </button>
                <button
                  type="button"
                  aria-pressed={onlyIssues}
                  disabled={problemCount === 0}
                  onClick={() => setOnlyIssues(true)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 ${onlyIssues ? 'bg-zinc-700 text-foreground' : 'text-foreground/65 hover:text-foreground'}`}
                >
                  {tx('editor.studio.filterCheck', { count: problemCount })}
                </button>
              </div>
            </div>
            <TranslationBar languages={languages} onAdd={addLanguage} onRemove={removeLanguage} />
            {(untimedCount > 0 || awaitingEnd != null) && (
              <div className="mx-3 mb-2 flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
                <div className="min-w-0 text-xs">
                  <div className="font-semibold text-foreground">
                    {awaitingEnd != null ? tx('editor.studio.markingLine', { text: lines[awaitingEnd]?.text ?? '' }) : tx('editor.studio.untimed', { count: untimedCount })}
                  </div>
                  <div className="truncate text-foreground/65">
                    {awaitingEnd != null ? t('editor.studio.markEndHint') : tx('editor.studio.stampNextLine', { text: lines[markTarget ?? nextUntimed]?.text ?? '' })}
                  </div>
                </div>
                <Button onClick={mark} className="h-11 shrink-0 rounded-[calc(var(--radius)*1)] bg-primary px-3.5 text-xs font-bold text-zinc-950 hover:bg-primary-dim">
                  {awaitingEnd != null ? t('editor.studio.markEnd') : t('editor.studio.markStart')}
                </Button>
              </div>
            )}
            <CueList
              rows={rows}
              cues={cues}
              lineTexts={lineTexts}
              languages={languages}
              translationTexts={translationTexts}
              issuesByCue={issuesByCue}
              onlyIssues={onlyIssues && problemCount > 0}
              selectedLine={selectedLine}
              markTarget={markTarget}
              onSelect={selectCue}
              onSelectLine={selectLine}
              onTimes={commitTimes}
              onText={commitText}
              onLineText={commitLineText}
              onTranslation={commitTranslation}
              onMark={mark}
              onAddLine={addLine}
              actions={cueActions}
            />
          </div>
        </div>

        <CueTimeline
          cues={cues}
          duration={duration}
          selectedLine={selectedLine}
          issueLines={issueLines}
          onSelect={setSelectedLine}
          onSeek={seek}
          onCommit={commitTimes}
          actions={cueActions}
        />
      </div>
      <ChangeMediaDialog open={mediaOpen} onOpenChange={setMediaOpen} />
    </>
  );
}
