"use client";

import { useEffect, useRef, useState } from "react";

export function usePolling<T>(
  load: () => Promise<T>,
  options: {
    intervalMs: number;
    isTerminal: (value: T) => boolean;
    initialData?: T;
  },
) {
  const [data, setData] = useState<T | null>(options.initialData ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [generation, setGeneration] = useState(0);
  const skipFirstLoad = useRef(options.initialData !== undefined);
  const loadRef = useRef(load);
  loadRef.current = load;
  const terminalRef = useRef(options.isTerminal);
  terminalRef.current = options.isTerminal;
  const { intervalMs } = options;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delay: number) => {
      if (cancelled) return;
      clearTimeout(timer);
      timer = setTimeout(run, delay);
    };

    async function run() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        schedule(1000);
        return;
      }
      try {
        const value = await loadRef.current();
        if (cancelled) return;
        setData(value);
        setError(null);
        if (!terminalRef.current(value)) schedule(intervalMs);
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof Error ? caught : new Error(String(caught)));
        schedule(intervalMs);
      }
    }

    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) schedule(0);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false;
      schedule(intervalMs);
    } else {
      run();
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs, generation]);

  return { data, error, refresh: () => setGeneration((value) => value + 1) };
}
