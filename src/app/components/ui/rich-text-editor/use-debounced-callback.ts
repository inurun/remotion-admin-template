import { useCallback, useEffect, useRef } from "react";

type UseDebouncedCallbackOptions = {
  flushOnUnmount?: boolean;
};

export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delayMs: number,
  { flushOnUnmount = true }: UseDebouncedCallbackOptions = {},
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<TArgs | null>(null);
  const flushOnUnmountRef = useRef(flushOnUnmount);

  callbackRef.current = callback;
  flushOnUnmountRef.current = flushOnUnmount;

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const invoke = useCallback((args: TArgs) => {
    pendingArgsRef.current = null;
    callbackRef.current(...args);
  }, []);

  const flush = useCallback(() => {
    cancel();
    const pendingArgs = pendingArgsRef.current;
    if (!pendingArgs) {
      return;
    }

    invoke(pendingArgs);
  }, [cancel, invoke]);

  const run = useCallback(
    (...args: TArgs) => {
      pendingArgsRef.current = args;
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        invoke(args);
      }, delayMs);
    },
    [cancel, delayMs, invoke],
  );

  const runImmediate = useCallback(
    (...args: TArgs) => {
      cancel();
      invoke(args);
    },
    [cancel, invoke],
  );

  useEffect(() => {
    return () => {
      if (flushOnUnmountRef.current && pendingArgsRef.current) {
        const args = pendingArgsRef.current;
        pendingArgsRef.current = null;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        callbackRef.current(...args);
        return;
      }

      cancel();
      pendingArgsRef.current = null;
    };
  }, [cancel]);

  return { cancel, flush, run, runImmediate };
}
