import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';

type InboxRowProps = {
  /** Avatar or icon on the left. */
  leading: ReactNode;
  children: ReactNode;
  /** Small line under the text, usually how long ago. */
  meta?: ReactNode;
  /** Navigate here when clicked. */
  to?: string;
  /** Or run this (opening a modal) when clicked. */
  onClick?: () => void;
};

const ROW = 'group/inbox flex w-full items-start gap-3 rounded-[calc(var(--radius)*1)] p-2.5 text-left transition-colors duration-[var(--duration-state)] hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus';

/** One pending action, laid out like a row of the notification dropdown. */
export function InboxRow({ leading, children, meta, to, onClick }: InboxRowProps) {
  const body = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="text-base leading-snug text-foreground">{children}</p>
        {meta && <p className="mt-0.5 font-mono text-xs text-subtle">{meta}</p>}
      </div>
      <Icon name="chevron_right" size={16} className="shrink-0 self-center text-subtle" />
    </>
  );
  return to
    ? <Link to={to} className={ROW}>{body}</Link>
    : <button type="button" onClick={onClick} className={ROW}>{body}</button>;
}

/** The round icon used as an `InboxRow`'s leading slot for rows that have no avatar. */
export function InboxIcon({ name }: { name: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-primary-ink" aria-hidden="true">
      <Icon name={name} size={18} />
    </span>
  );
}

/** A section heading in the same style as the dropdown's. */
export function InboxSectionLabel({ children }: { children: ReactNode }) {
  return <p className="px-2.5 pt-4 pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-ink">{children}</p>;
}
