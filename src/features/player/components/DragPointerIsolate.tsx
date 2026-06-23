import { useRef, useEffect } from 'react';
import type { ReactNode } from 'react';

/**
 * Stops `pointerdown` from bubbling to ancestor drag listeners (e.g. framer-motion's
 * Reorder.Item, which attaches a NATIVE pointerdown listener on the panel). A React
 * synthetic `onPointerDown` + stopPropagation runs at React's root delegation — too late
 * to stop a native listener that already fired on an intermediate node during DOM bubbling.
 * So we attach a real native listener here and stop propagation before it reaches the panel.
 */
export default function DragPointerIsolate({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: PointerEvent) => e.stopPropagation();
    el.addEventListener('pointerdown', stop);
    return () => el.removeEventListener('pointerdown', stop);
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
