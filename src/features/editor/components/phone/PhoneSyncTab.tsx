import type { ReactNode } from 'react';

type PhoneSyncTabProps = {
  /** Tab panel wiring, from PhoneEditor's tab strip. */
  id?: string;
  labelledBy?: string;
  /** The lyric list (VirtualizedLineList); it owns the only scroll container here. */
  list: ReactNode;
  /** Optional in-flow notice above the list, such as the publish prompt. */
  banner?: ReactNode;
  player: ReactNode;
  /** Absent for a read-only viewer. */
  markBar?: ReactNode;
};

/**
 * Sync tab body. Portrait: the list takes every pixel the player and Mark row leave.
 * Short landscape: list on the left, player and Mark on the right, so the list keeps its
 * height. The player and Mark are siblings of the list's scroller, never inside it.
 */
export default function PhoneSyncTab({ id, labelledBy, list, banner, player, markBar }: PhoneSyncTabProps) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={labelledBy} className="flex flex-1 min-h-0 flex-col short-landscape:flex-row">
      <div data-testid="phone-list-pane" className="flex flex-1 min-h-0 min-w-0 flex-col">
        {banner}
        {list}
      </div>
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/60 short-landscape:flex short-landscape:w-[min(22rem,42%)] short-landscape:flex-col short-landscape:justify-end short-landscape:border-t-0 short-landscape:border-l">
        {player}
        {markBar}
      </div>
    </div>
  );
}
