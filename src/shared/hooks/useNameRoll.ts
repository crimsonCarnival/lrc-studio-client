import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { randomDisplayName } from '@/shared/utils/random-name';

const FIRST_DELAY_MS = 50;
const SLOWDOWN = 1.22;
const STOP_AFTER_MS = 260;

/**
 * Slot-machine roll: flashes random names, slowing down, then settles on the last one.
 * Reduced-motion users get the final name at once.
 */
export function useNameRoll(onName: (name: string) => void) {
  const [rolling, setRolling] = useState(false);
  const rollingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const onNameRef = useRef(onName);

  useLayoutEffect(() => { onNameRef.current = onName; });
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const roll = useCallback((current: string) => {
    if (rollingRef.current) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onNameRef.current(randomDisplayName(current));
      return;
    }
    rollingRef.current = true;
    setRolling(true);
    let delay = FIRST_DELAY_MS;
    let shown = current;
    const step = () => {
      shown = randomDisplayName(shown);
      onNameRef.current(shown);
      delay *= SLOWDOWN;
      if (delay > STOP_AFTER_MS) {
        rollingRef.current = false;
        setRolling(false);
        return;
      }
      timerRef.current = window.setTimeout(step, delay);
    };
    step();
  }, []);

  return { rolling, roll };
}
