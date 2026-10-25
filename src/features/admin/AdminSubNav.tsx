import { Link } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { adminPath } from './admin-nav';
import type { AdminTabId } from './admin-nav';

export interface AdminSubNavItem {
  id: string;
  label: string;
  icon?: string;
}

/** The row of sub-view links under a tab. Each one is a URL of its own. */
export function AdminSubNav({ tab, items, current }: { tab: AdminTabId; items: AdminSubNavItem[]; current: string }) {
  return (
    <div role="tablist" className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-zinc-800/40 overflow-x-auto">
      {items.map(item => (
        <Link
          key={item.id}
          to={adminPath(tab, item.id)}
          replace
          role="tab"
          aria-selected={current === item.id}
          className={`flex items-center gap-1.5 px-3 py-2 coarse:py-3.5 text-xs font-semibold rounded-t-md border-b-2 -mb-px transition-colors whitespace-nowrap ${
            current === item.id
              ? 'border-primary/70 text-primary bg-primary/5'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {item.icon && <Icon name={item.icon} size={14} className="shrink-0" />}
          {item.label}
        </Link>
      ))}
    </div>
  );
}
