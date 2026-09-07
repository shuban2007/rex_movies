import { useState, useCallback } from 'react';

/**
 * A useState wrapper that persists the value in localStorage.
 *
 * - Reads the initial value from localStorage (falling back to `defaultValue`).
 * - Writes updates back on every `setValue` call.
 * - Gracefully handles storage errors (quota, private browsing).
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setStateInner] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // storage unavailable or corrupt — fall through
    }
    return defaultValue;
  });

  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateInner((prev) => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // quota exceeded or private browsing — silently ignore
        }
        return next;
      });
    },
    [key],
  );

  return [state, setState];
}
