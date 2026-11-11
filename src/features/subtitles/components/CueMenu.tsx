import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent } from '@ui/context-menu';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@ui/dropdown-menu';
import { contextMenuComponents, dropdownMenuComponents, type MenuComponents } from '@ui/menu-components';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import { usePlayer } from '@/features/player/PlayerContext';
import { canSplitCue } from '../subtitle-edits';
import type { Cue } from '../subtitles.types';

/** What a subtitle's menu can do. Every action takes the cue's index in the time-ordered list. */
export type CueActions = {
  onStamp: (cueIndex: number, edge: 'start' | 'end') => void;
  onSplit: (cueIndex: number) => void;
  onMerge: (cueIndex: number) => void;
  onClearEnd: (cueIndex: number) => void;
  onClearTimes: (cueIndex: number) => void;
  onRemove: (cueIndex: number) => void;
};

type CueMenuTarget = {
  cue: Cue;
  index: number;
  /** Whether a cue follows this one, which is what merging needs. */
  hasNext: boolean;
  actions: CueActions;
};

/**
 * The menu's items, written once and rendered through either the ContextMenu or the
 * DropdownMenu component set, so right-click and the "…" button cannot drift apart. A
 * component of its own, mounted only while a menu is open, so it can read the playhead
 * (to know whether a split is possible) without every row subscribing to the clock.
 */
function CueMenuItems({ C, cue, index, hasNext, actions }: CueMenuTarget & { C: MenuComponents }): ReactNode {
  const { t } = useTranslation();
  const tx = t as (key: string, options?: Record<string, unknown>) => string;
  const { currentTime } = usePlayer();
  // Below lg the items are touch targets even with a fine pointer (narrow desktop windows).
  const item = 'max-lg:min-h-11';

  return (
    <>
      <C.Item className={item} onClick={() => actions.onStamp(index, 'start')}>
        <Icon name="arrow_back" />
        {tx('editor.studio.stampIn')}
      </C.Item>
      <C.Item className={item} onClick={() => actions.onStamp(index, 'end')}>
        <Icon name="arrow_forward" />
        {tx('editor.studio.stampOut')}
      </C.Item>
      <C.Separator />
      <C.Item className={item} disabled={!canSplitCue(cue, cue.text, currentTime)} onClick={() => actions.onSplit(index)}>
        <Icon name="call_split" />
        {tx('editor.studio.split')}
      </C.Item>
      <C.Item className={item} disabled={!hasNext} onClick={() => actions.onMerge(index)}>
        <Icon name="link" />
        {tx('editor.studio.merge')}
      </C.Item>
      <C.Separator />
      <C.Item variant="warning" className={item} onClick={() => actions.onClearEnd(index)}>
        <Icon name="ink_eraser" />
        {tx('editor.studio.clearEnd')}
      </C.Item>
      <C.Item variant="warning" className={item} onClick={() => actions.onClearTimes(index)}>
        <Icon name="ink_eraser" />
        {tx('editor.studio.clearTimes')}
      </C.Item>
      <C.Separator />
      <C.Item variant="destructive" className={item} onClick={() => actions.onRemove(index)}>
        <Icon name="delete" />
        {tx('editor.studio.remove')}
      </C.Item>
    </>
  );
}

/** Right-click trigger. `children` must be a SINGLE element: asChild forwards a ref to it. */
export function CueMenu({ children, ...target }: CueMenuTarget & { children: ReactNode }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <CueMenuItems C={contextMenuComponents} {...target} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** The visible "…" trigger: the touch- and keyboard-reachable way to the same items. */
export function CueMenuButton({ className, ...target }: CueMenuTarget & { className?: string }) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <Tip content={t('common.moreActions')}>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={t('common.moreActions')} className={className}>
            <Icon name="more_horiz" size={16} />
          </button>
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end">
        <CueMenuItems C={dropdownMenuComponents} {...target} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
