import { useState, useMemo } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@ui/search-field';
import { cn } from '@/shared/utils/utils';
import { Kbd } from '@ui/kbd';
import { useShortcutsSettings } from '../../hooks/useShortcutsSettings';

type GroupId = 'editor' | 'player' | 'preview' | 'view';
type TabId = 'all' | GroupId;

interface ShortcutDef {
  id: string;
  group: GroupId;
  /** Mouse modifiers (held while clicking) are recorded as a single modifier key. */
  modifier?: boolean;
  fallback: string;
}

// Order here is the order shown on the page.
const SHORTCUTS: ShortcutDef[] = [
  { id: 'mark', group: 'editor', fallback: 'Enter' },
  { id: 'nudgeLeft', group: 'editor', fallback: 'Alt+ArrowLeft' },
  { id: 'nudgeRight', group: 'editor', fallback: 'Alt+ArrowRight' },
  { id: 'nudgeLeftFine', group: 'editor', fallback: 'Shift+ArrowLeft' },
  { id: 'nudgeRightFine', group: 'editor', fallback: 'Shift+ArrowRight' },
  { id: 'prevLine', group: 'editor', fallback: 'ArrowUp' },
  { id: 'nextLine', group: 'editor', fallback: 'ArrowDown' },
  { id: 'addLine', group: 'editor', fallback: 'Ctrl+Enter' },
  { id: 'duplicateLine', group: 'editor', fallback: 'Ctrl+D' },
  { id: 'deleteLine', group: 'editor', fallback: 'Delete' },
  { id: 'clearTimestamp', group: 'editor', fallback: 'Backspace' },
  { id: 'captureAdLib', group: 'editor', fallback: 'a' },
  { id: 'searchLyrics', group: 'editor', fallback: '/' },
  { id: 'switchMode', group: 'editor', fallback: 'Ctrl+M' },
  { id: 'deselect', group: 'editor', fallback: 'Escape' },
  { id: 'showHelp', group: 'editor', fallback: '?' },
  { id: 'rangeSelect', group: 'editor', modifier: true, fallback: 'Shift' },
  { id: 'toggleSelect', group: 'editor', modifier: true, fallback: 'Ctrl' },
  { id: 'playPause', group: 'player', fallback: 'Space' },
  { id: 'loopClick', group: 'player', modifier: true, fallback: 'Shift' },
  { id: 'loopLine', group: 'player', fallback: 'L' },
  { id: 'seekBackward', group: 'player', fallback: 'ArrowLeft' },
  { id: 'seekForward', group: 'player', fallback: 'ArrowRight' },
  { id: 'mute', group: 'player', fallback: 'm' },
  { id: 'speedUp', group: 'player', fallback: '+' },
  { id: 'speedDown', group: 'player', fallback: '-' },
  { id: 'toggleTranslation', group: 'preview', fallback: 't' },
  { id: 'addSecondary', group: 'preview', fallback: 'Shift+H' },
  { id: 'addTranslation', group: 'preview', fallback: 'Shift+T' },
  { id: 'alignLeft', group: 'view', fallback: 'Shift+L' },
  { id: 'alignCenter', group: 'view', fallback: 'Shift+C' },
  { id: 'alignRight', group: 'view', fallback: 'Shift+R' },
  { id: 'toggleFullLyrics', group: 'view', fallback: 'l' },
  { id: 'toggleVisualizer', group: 'view', fallback: 'v' },
  { id: 'openVisualizer', group: 'view', fallback: 'Shift+V' },
  { id: 'togglePlayer', group: 'view', fallback: 'p' },
];

// Shortcuts that share a keystroke are flagged against each other (modifiers are a separate space).
const COMBO_IDS = SHORTCUTS.filter((s) => !s.modifier).map((s) => s.id);

// Which page each shortcut listens on: two shortcuts only clash when both are live on the same
// page (the editor's L loops the line, the project view's L shows the full lyrics). Player keys
// work in both, and so does hiding the player.
const PAGES_BY_GROUP: Record<GroupId, readonly string[]> = { editor: ['editor'], preview: ['editor'], player: ['editor', 'view'], view: ['view'] };
const PAGES_BY_ID: Record<string, readonly string[]> = { togglePlayer: ['editor', 'view'], loopLine: ['editor'] };
const pagesOf = (id: string) => PAGES_BY_ID[id] ?? PAGES_BY_GROUP[SHORTCUTS.find((s) => s.id === id)!.group];
const sharePage = (a: string, b: string) => pagesOf(a).some((p) => pagesOf(b).includes(p));

const KEY_GLYPHS: Record<string, string> = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Backspace: '⌫', Escape: 'Esc',
};

interface ShortcutsSettingsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: { shortcuts?: Record<string, string[] | undefined>; editor?: { nudge?: { default?: number; fine?: number } }; playback?: { seekTime?: number }; [key: string]: any };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
  validateShortcut: (value: string, key: string) => boolean;
}

export default function ShortcutsSettings({ settings, updateSetting, searchTerm, validateShortcut }: ShortcutsSettingsProps) {
  const { t, i18n } = useTranslation();
  const tk = t as (key: string, opts?: Record<string, unknown>) => string;
  const { handleShortcutChange } = useShortcutsSettings(updateSetting);
  const [tab, setTab] = useState<TabId>('all');
  const [localQuery, setLocalQuery] = useState('');
  const [recording, setRecording] = useState<string | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);

  const nudge = String(settings.editor?.nudge?.default ?? 0.1).replace('.', ',');
  const seek = settings.playback?.seekTime ?? 5;
  // Descriptions interpolate the nudge step, except the player seek ones (the seek interval).
  const fine = String(settings.editor?.nudge?.fine ?? 0.01).replace('.', ',');
  const valsFor = (group: GroupId) => ({ val: group === 'player' ? seek : nudge, fine });
  const valueOf = (def: ShortcutDef) => settings.shortcuts?.[def.id]?.[0] || def.fallback;

  const keyLabel = (part: string) => {
    if (part === 'Space') return tk('settings.shortcuts.keys.space');
    if (part === 'Delete') return tk('settings.shortcuts.keys.delete');
    if (KEY_GLYPHS[part]) return KEY_GLYPHS[part];
    return part.length === 1 ? part.toUpperCase() : part;
  };
  // "+" alone is a key; otherwise "+" separates parts.
  const partsOf = (combo: string) => combo.split(/(?<=.)\+/);

  const conflicts = useMemo(() => {
    const byValue: Record<string, string[]> = {};
    for (const id of COMBO_IDS) {
      const v = settings.shortcuts?.[id]?.[0] || SHORTCUTS.find((s) => s.id === id)!.fallback;
      (byValue[v] ??= []).push(id);
    }
    const out: Record<string, string> = {};
    for (const ids of Object.values(byValue)) {
      if (ids.length < 2) continue;
      for (const id of ids) {
        const clashing = ids.filter((o) => o !== id && sharePage(id, o));
        if (clashing.length === 0) continue;
        out[id] = clashing.map((o) => tk(`settings.shortcuts.${o}Label`, valsFor(SHORTCUTS.find((x) => x.id === o)!.group))).join(', ');
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.shortcuts, nudge, fine, seek, i18n.language]);

  const query = (searchTerm || localQuery).trim().toLowerCase();
  const rows = SHORTCUTS.map((def) => {
    const combo = valueOf(def);
    const name = tk(`settings.shortcuts.${def.id}Label`, valsFor(def.group));
    const descKey = `settings.shortcuts.${def.id}Desc`;
    const desc = i18n.exists(descKey) ? tk(descKey, valsFor(def.group)) : '';
    return { def, combo, name, desc, parts: partsOf(combo) };
  }).filter((r) => {
    if (!searchTerm && tab !== 'all' && r.def.group !== tab) return false;
    if (!query) return true;
    return `${r.name} ${r.desc} ${r.parts.map(keyLabel).join(' ')} ${r.combo}`.toLowerCase().includes(query);
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, def: ShortcutDef) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') { setRecording(null); return; }

    let next: string;
    if (def.modifier) {
      const mod = e.key === 'Shift' ? 'Shift' : e.key === 'Control' || e.key === 'Meta' ? 'Ctrl' : e.key === 'Alt' ? 'Alt' : null;
      if (!mod) return;
      // Modifiers clash only within a group: they act on different surfaces (lines vs waveform).
      const taken = SHORTCUTS.some((s) => s.modifier && s.group === def.group && s.id !== def.id && mod === valueOf(s));
      if (taken) { setRejected(def.id); setRecording(null); return; }
      next = mod;
    } else {
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
      const keyName = e.code === 'Space' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      parts.push(keyName);
      next = parts.join('+');
      if (!validateShortcut(next, def.id)) { setRejected(def.id); setRecording(null); return; }
    }
    handleShortcutChange(def.id)(next);
    setRejected(null);
    setRecording(null);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all', label: tk('settings.shortcuts.tabAll') },
    { id: 'editor', label: tk('settings.editor.label') },
    { id: 'player', label: tk('settings.shortcuts.playerSection') },
    { id: 'preview', label: tk('settings.shortcuts.previewSection') },
    { id: 'view', label: tk('settings.shortcuts.viewSection') },
  ];
  const groupTitle: Record<GroupId, string> = {
    editor: tk('settings.editor.label'),
    player: tk('settings.shortcuts.playerSection'),
    preview: tk('settings.shortcuts.previewSection'),
    view: tk('settings.shortcuts.viewSection'),
  };
  const groups = (['editor', 'player', 'preview', 'view'] as GroupId[])
    .map((g) => ({ id: g, items: rows.filter((r) => r.def.group === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!searchTerm && (
          <div role="tablist" aria-label={tk('settings.shortcuts.filterLabel')} className="flex gap-0.5 p-[3px] rounded-[calc(var(--radius)*1)] bg-zinc-950 border border-zinc-700">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                type="button"
                role="tab"
                aria-selected={tab === tb.id}
                onClick={() => setTab(tb.id)}
                className={cn('h-9 px-3.5 rounded-lg text-sm font-semibold transition-colors coarse:h-11', tab === tb.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200')}
              >
                {tb.label}
              </button>
            ))}
          </div>
        )}
        {/* The settings sidebar search owns "/" on this page. */}
        <SearchField
          compact
          focusShortcut={false}
          label={tk('settings.shortcuts.searchLabel')}
          placeholder={tk('settings.shortcuts.searchPlaceholder')}
          value={localQuery}
          onValueChange={setLocalQuery}
          className="flex-[0_1_260px] ml-auto"
        />
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-zinc-500 text-center py-12">{tk('settings.searchNoResults')}</p>
      )}

      {groups.map((g) => (
        <section key={g.id} className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 px-6 pb-2 pt-4">
          <div className="flex items-center justify-between gap-3 pb-1">
            <h2 className="text-xs font-bold uppercase tracking-[.09em] text-primary">{groupTitle[g.id]}</h2>
            <span className="text-[13px] text-zinc-400">{tk('settings.shortcuts.count', { count: g.items.length })}</span>
          </div>
          {g.items.map(({ def, name, desc, parts }) => {
            const isRec = recording === def.id;
            const conflict = conflicts[def.id];
            return (
              <div key={def.id} className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3.5 [&+&]:border-t [&+&]:border-zinc-800">
                <div className="flex-1 basis-64 min-w-0">
                  <p className="text-[15px] font-semibold text-zinc-100 leading-snug">{name}</p>
                  {desc && <p className="text-[13px] text-zinc-400 mt-[3px]">{desc}</p>}
                  {conflict && <p className="text-xs text-amber-400 mt-1">⚠ {tk('settings.shortcuts.conflictWith', { name: conflict })}</p>}
                  {rejected === def.id && <p className="text-xs text-red-400 mt-1">{tk('settings.shortcuts.input.taken')}</p>}
                </div>
                <button
                  type="button"
                  aria-label={tk('settings.shortcuts.changeAria', { name, keys: parts.map(keyLabel).join(' + ') })}
                  onClick={() => { setRejected(null); setRecording(isRec ? null : def.id); }}
                  onKeyDown={isRec ? (e) => handleKeyDown(e, def) : undefined}
                  onBlur={() => isRec && setRecording(null)}
                  className={cn(
                    'flex items-center justify-end gap-1.5 min-w-[120px] h-11 px-2.5 rounded-[calc(var(--radius)*1)] border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    isRec ? 'border-primary bg-zinc-800' : conflict ? 'border-amber-500/60' : 'border-transparent hover:bg-zinc-800/60',
                  )}
                >
                  {isRec ? (
                    <span className="text-[13px] font-semibold text-primary animate-pulse">
                      {def.modifier ? tk('settings.shortcuts.input.modifier') : tk('settings.shortcuts.recording')}
                    </span>
                  ) : (
                    <>
                      {parts.map((p, i) => (
                        <Kbd key={i} className="h-7 min-w-7">{keyLabel(p)}</Kbd>
                      ))}
                      {def.modifier && <span className="text-[13px] text-zinc-400">{tk('settings.shortcuts.clickSuffix')}</span>}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
