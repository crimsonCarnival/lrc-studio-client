import { useState, useCallback, useRef, useEffect } from 'react';
import { Deque } from '@crimson-carnival/ds-js';

interface HistoryOptions<T> {
  limit?: number;
  groupingThresholdMs?: number;
  getCompanion?: () => unknown;
  onRestoreCompanion?: (companion: unknown) => void;
}

interface HistoryEntry<T> {
  value: T;
  companion: unknown;
}

type HistoryUpdater<T> = T | ((prev: T) => T);

/**
 * Custom hook for undo/redo history management.
 * Wraps a state value with a history stack (capped at `options.limit`).
 * Supports time-based grouping: rapid updates within `groupingThresholdMs`
 * are collapsed into a single undo entry.
 */
export default function useHistory<T>(
  initial: T,
  options: HistoryOptions<T> = {},
): [T, (updater: HistoryUpdater<T>) => void, () => void, () => void, boolean, boolean, () => void] {
  const limit = options.limit || 50;
  const groupingThresholdMs = options.groupingThresholdMs || 500;

  const getCompanionRef = useRef<(() => unknown) | null>(null);
  const onRestoreCompanionRef = useRef<((companion: unknown) => void) | null>(null);
  useEffect(() => {
    getCompanionRef.current = options.getCompanion || null;
    onRestoreCompanionRef.current = options.onRestoreCompanion || null;
  });

  const [state, setStateRaw] = useState<T>(initial);

  // Using Deque from ds-js for past and future to support limit truncation
  const pastRef = useRef<Deque<HistoryEntry<T>> | null>(null);
  const futureRef = useRef<Deque<HistoryEntry<T>> | null>(null);
  if (pastRef.current === null) pastRef.current = new Deque<HistoryEntry<T>>();
  if (futureRef.current === null) futureRef.current = new Deque<HistoryEntry<T>>();

  const lastUpdateRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const pendingRestoreRef = useRef<unknown>(null);

  const setState = useCallback((updater: HistoryUpdater<T>) => {
    setStateRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
      if (next === prev) return prev;

      const now = Date.now();
      if (now - lastUpdateRef.current > groupingThresholdMs) {
        const companion = getCompanionRef.current?.();
        pastRef.current!.pushBack({ value: prev, companion });

        // Enforce history limit by removing the oldest entry
        if (pastRef.current!.size > limit) {
          pastRef.current!.popFront();
        }
      }

      lastUpdateRef.current = now;
      futureRef.current!.clear();

      setCanUndo(!pastRef.current!.isEmpty());
      setCanRedo(false);

      return next;
    });
  }, [limit, groupingThresholdMs]);

  const undo = useCallback(() => {
    setStateRaw((prev) => {
      if (pastRef.current!.isEmpty()) return prev;

      const entry = pastRef.current!.popBack()!;
      const currentCompanion = getCompanionRef.current?.();
      futureRef.current!.pushBack({ value: prev, companion: currentCompanion });

      lastUpdateRef.current = 0;
      setCanUndo(!pastRef.current!.isEmpty());
      setCanRedo(true);

      if (entry.companion !== undefined && onRestoreCompanionRef.current) {
        pendingRestoreRef.current = entry.companion;
      }

      return entry.value;
    });
  }, []);

  const redo = useCallback(() => {
    setStateRaw((prev) => {
      if (futureRef.current!.isEmpty()) return prev;

      const entry = futureRef.current!.popBack()!;
      const currentCompanion = getCompanionRef.current?.();
      pastRef.current!.pushBack({ value: prev, companion: currentCompanion });

      lastUpdateRef.current = 0;
      setCanUndo(true);
      setCanRedo(!futureRef.current!.isEmpty());

      if (entry.companion !== undefined && onRestoreCompanionRef.current) {
        pendingRestoreRef.current = entry.companion;
      }

      return entry.value;
    });
  }, []);

  const clearHistory = useCallback(() => {
    pastRef.current!.clear();
    futureRef.current!.clear();
    lastUpdateRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  useEffect(() => {
    if (pendingRestoreRef.current !== null) {
      const companion = pendingRestoreRef.current;
      pendingRestoreRef.current = null;
      onRestoreCompanionRef.current?.(companion);
    }
  });

  return [state, setState, undo, redo, canUndo, canRedo, clearHistory];
}
