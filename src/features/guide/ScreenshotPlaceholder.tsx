import { Icon } from '@/shared/ui/Icon';

interface ScreenshotPlaceholderProps {
  id: string;
  caption: string;
  aspect?: string;
}

/**
 * Placeholder box for a guide screenshot that hasn't been dropped in yet.
 * Swap for a real <img src="/guide/<id>.png" /> once the asset exists.
 */
export function ScreenshotPlaceholder({ id, caption, aspect = 'aspect-video' }: ScreenshotPlaceholderProps) {
  return (
    <div
      data-screenshot-slot={id}
      className={`${aspect} w-full rounded-xl border-2 border-dashed border-zinc-700/60 bg-zinc-900/40 flex flex-col items-center justify-center gap-2 text-center px-4`}
    >
      <Icon name="image" size={28} className="text-zinc-600" />
      <p className="text-xs text-zinc-500 max-w-sm">{caption}</p>
      <span className="text-[10px] font-mono text-zinc-700">#{id}</span>
    </div>
  );
}
