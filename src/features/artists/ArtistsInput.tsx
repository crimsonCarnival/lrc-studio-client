import { useId, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, DragEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import { getAccessToken } from '@/app/api';
import { ARTIST_LIMITS, type ArtistCredit, type ArtistRole } from '@/shared/utils/artists';
import { creditsProblem, mergeCredits, nameKey, renumber } from './artist-credits';
import { artistErrorMessage } from './artist-errors';
import { ArtistImportReview } from './ArtistImportReview';
import { useArtistImport } from './useArtistImport';
import { useArtistSuggestions } from './useArtistSuggestions';

interface ArtistsInputProps {
  value: ArtistCredit[];
  onChange: (next: ArtistCredit[]) => void;
  /** Prefix for element ids, so two inputs on one page do not collide. */
  idPrefix?: string;
  className?: string;
}

/** Text that is more than one name or carries a marker: parsed instead of added as a single chip. */
const NEEDS_PARSING = /[,&×]|\s(?:and|x)\s|(?:^|\s)(?:feat\.?|ft\.?|featuring)(?:\s|$)|[([]/i;

/**
 * The artist editor: a Primary field and a Featured field, each a list of chips that can be
 * added to, removed, dragged or moved with Alt+Left/Right. Typing or pasting runs the shared
 * parser (so `A, B & C` and `A feat. B` become chips) and anything doubtful goes to a review
 * before it is applied. Names the user has credited before are suggested while typing.
 */
export function ArtistsInput({ value, onChange, idPrefix, className }: ArtistsInputProps) {
  const { t } = useTranslation();
  const tr = t as (k: string, o?: object) => string;
  const autoId = useId();
  const id = idPrefix ?? autoId;
  const importer = useArtistImport();
  const [announcement, setAnnouncement] = useState('');

  const credits = useMemo(() => renumber(value), [value]);
  const problem = creditsProblem(credits);
  const atLimit = credits.length >= ARTIST_LIMITS.maxArtists;

  const commit = (next: ArtistCredit[], message?: string) => {
    onChange(renumber(next));
    if (message) setAnnouncement(message);
  };

  const roleCredits = (role: ArtistRole) => credits.filter((c) => c.role === role);

  const addFromText = (text: string, role: ArtistRole) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    importer.propose({ artist: trimmed }, (incoming) => {
      // The Featured field takes whatever it is given as featured; in the Primary field "A feat. B" keeps B featured.
      const next = mergeCredits(credits, role === 'featured' ? incoming.map((c) => ({ ...c, role })) : incoming);
      const known = new Set(credits.map((c) => nameKey(c.name)));
      const added = next.filter((c) => !known.has(nameKey(c.name))).map((c) => c.name);
      commit(next, added.length > 0 ? tr('artists.announce.added', { names: added.join(', '), role: tr(`artists.${role}.label`) }) : '');
    }, role === 'featured' ? 'featured' : undefined);
  };

  const addName = (name: string, role: ArtistRole) => {
    const next = mergeCredits(credits, [{ name, role, order: 0 }]);
    if (next.length !== credits.length) commit(next, tr('artists.announce.added', { names: name, role: tr(`artists.${role}.label`) }));
  };

  const remove = (credit: ArtistCredit) => {
    commit(credits.filter((c) => c !== credit), tr('artists.announce.removed', { name: credit.name }));
  };

  const move = (role: ArtistRole, from: number, to: number) => {
    const list = roleCredits(role);
    if (to < 0 || to >= list.length || from === to) return;
    const reordered = [...list];
    const [item] = reordered.splice(from, 1);
    reordered.splice(to, 0, item);
    const other = credits.filter((c) => c.role !== role);
    commit(role === 'primary' ? [...reordered, ...other] : [...other, ...reordered],
      tr('artists.announce.moved', { name: item.name, position: to + 1, total: list.length }));
  };

  const field = (role: ArtistRole) => (
    <ChipField
      key={role}
      role={role}
      id={`${id}-${role}`}
      credits={roleCredits(role)}
      allNames={credits.map((c) => nameKey(c.name))}
      disabled={atLimit}
      onAddText={(text) => addFromText(text, role)}
      onPickName={(name) => addName(name, role)}
      onRemove={remove}
      onMove={(from, to) => move(role, from, to)}
    />
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {field('primary')}
      {field('featured')}

      {atLimit && <p className="text-xs text-subtle">{tr('artists.limit', { max: ARTIST_LIMITS.maxArtists })}</p>}
      {problem && (
        <p role="alert" className="text-xs text-love">
          {artistErrorMessage(t, problem.code, { name: problem.name, max: problem.code === 'artist_name_too_long' ? ARTIST_LIMITS.maxNameLength : ARTIST_LIMITS.maxArtists })}
        </p>
      )}

      <ArtistImportReview importer={importer} />
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    </div>
  );
}

interface ChipFieldProps {
  role: ArtistRole;
  id: string;
  credits: ArtistCredit[];
  /** Every credited name (both roles), so a suggestion is never one that would be a duplicate. */
  allNames: string[];
  disabled: boolean;
  onAddText: (text: string) => void;
  onPickName: (name: string) => void;
  onRemove: (credit: ArtistCredit) => void;
  onMove: (from: number, to: number) => void;
}

function ChipField({ role, id, credits, allNames, disabled, onAddText, onPickName, onRemove, onMove }: ChipFieldProps) {
  const { t } = useTranslation();
  const tr = t as (k: string, o?: object) => string;
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const signedIn = getAccessToken();

  const { items, status } = useArtistSuggestions(draft, open && signedIn);
  const taken = new Set(allNames);
  const options = items.filter((s) => !taken.has(nameKey(s.name)));
  const showList = open && signedIn && draft.trim().length > 0;
  const listId = `${id}-list`;

  const submit = () => {
    onAddText(draft);
    setDraft('');
    setActive(-1);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && options.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === 'ArrowUp' && options.length > 0) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && options[active]) {
        onPickName(options[active].name);
        setDraft('');
        setActive(-1);
      } else submit();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    } else if (e.key === 'Backspace' && draft === '' && credits.length > 0) {
      onRemove(credits[credits.length - 1]);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!NEEDS_PARSING.test(text)) return;
    e.preventDefault();
    onAddText(`${draft}${text}`);
    setDraft('');
  };

  const onChipKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const to = index + (e.key === 'ArrowLeft' ? -1 : 1);
      onMove(index, to);
      requestAnimationFrame(() => chipRefs.current[Math.max(0, Math.min(credits.length - 1, to))]?.focus());
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onRemove(credits[index]);
    }
  };

  const onDragStart = (e: DragEvent, index: number) => {
    setDragFrom(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', credits[index].name);
  };
  const onDrop = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (dragFrom !== null) onMove(dragFrom, index);
    setDragFrom(null);
  };

  const primary = role === 'primary';

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-input`} className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {tr(`artists.${role}.label`)}
      </label>

      <ul role="list" aria-label={tr(`artists.${role}.label`)} className="flex flex-wrap gap-1.5 empty:hidden">
        {credits.map((credit, index) => (
          <li
            key={credit.name}
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, index)}
            onDragEnd={() => setDragFrom(null)}
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full py-0.5 pl-1 pr-0.5 text-sm inset-ring',
              primary ? 'bg-primary-soft text-primary-ink inset-ring-iris' : 'bg-raised text-subtle inset-ring-hl',
              dragFrom === index && 'opacity-50',
            )}
          >
            <span aria-hidden="true" className="cursor-grab select-none px-0.5 text-xs leading-none opacity-60">⋮⋮</span>
            <button
              type="button"
              ref={(el) => { chipRefs.current[index] = el; }}
              onKeyDown={(e) => onChipKeyDown(e, index)}
              aria-label={tr('artists.chipLabel', { name: credit.name, position: index + 1, total: credits.length })}
              className="max-w-[16rem] truncate rounded-full px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {credit.name}
            </button>
            <button
              type="button"
              onClick={() => onRemove(credit)}
              aria-label={tr('artists.remove', { name: credit.name })}
              className="grid size-6 place-items-center rounded-full hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon name="close" size={13} />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative">
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-describedby={`${id}-hint`}
          value={draft}
          disabled={disabled}
          maxLength={ARTIST_LIMITS.maxNameLength}
          placeholder={tr(`artists.${role}.placeholder`)}
          onChange={(e) => { setDraft(e.target.value); setActive(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setOpen(false); if (draft.trim()) submit(); }}
          onKeyDown={onInputKeyDown}
          onPaste={onPaste}
          className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
        />
        <p id={`${id}-hint`} className="mt-1 text-xs text-faint">{tr(`artists.${role}.help`)} {credits.length > 1 ? tr('artists.reorderHint') : ''}</p>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label={tr('artists.suggestions.label')}
            className="absolute left-0 right-0 top-9 z-20 max-h-52 overflow-y-auto rounded-md bg-card p-1 shadow-elevated inset-ring inset-ring-hl"
          >
            {options.map((s, i) => (
              <li
                key={s.id}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: the input's blur would otherwise add the half-typed text first.
                onMouseDown={(e) => { e.preventDefault(); onPickName(s.name); setDraft(''); setActive(-1); }}
                className={cn('cursor-pointer rounded px-2 py-1.5 text-sm text-foreground', i === active && 'bg-primary-soft text-primary-ink')}
              >
                {s.name}
              </li>
            ))}
            {status === 'loading' && <li role="presentation" className="px-2 py-1.5 text-xs text-subtle">{tr('artists.suggestions.loading')}</li>}
            {status === 'error' && <li role="presentation" className="px-2 py-1.5 text-xs text-love">{tr('artists.suggestions.error')}</li>}
            {status === 'ready' && options.length === 0 && <li role="presentation" className="px-2 py-1.5 text-xs text-subtle">{tr('artists.suggestions.empty')}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
