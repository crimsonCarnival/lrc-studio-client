import { cn } from '@/shared/utils/utils';

const TICKS = Array.from({ length: 12 }, (_, i) => i);

function Ticks({ lit }: { lit?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-between">
      {TICKS.map((i) => (
        <b key={i} className={cn('block w-[3px] rounded-sm', lit ? 'h-[18px] bg-iris' : 'h-3.5 bg-hl')} />
      ))}
    </div>
  );
}

/**
 * Indeterminate loader for timing work (redesign sheet 08): a playhead sweeps a row of beat
 * ticks and lights each one it passes. Use it where the app is marking or splitting lyrics;
 * LogoLoader stays the general-purpose loader.
 */
export function SyncSweep({ label, className }: { label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={cn('relative h-9 w-full', className)}>
      <Ticks />
      <div className="sync-sweep-lit absolute inset-0">
        <Ticks lit />
      </div>
      <span className="sync-sweep-head absolute top-0.5 bottom-0.5 w-0.5 rounded-sm bg-foam" />
    </div>
  );
}
