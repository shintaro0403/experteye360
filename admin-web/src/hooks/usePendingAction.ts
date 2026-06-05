import { useCallback, useRef, useState } from "react";

export function usePendingAction() {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const runPending = useCallback(async (key: string, fn: () => Promise<void> | void) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPendingAction(key);
    try {
      await fn();
    } finally {
      inFlightRef.current = false;
      setPendingAction(null);
    }
  }, []);

  const isPending = useCallback((key: string) => pendingAction === key, [pendingAction]);

  return { pendingAction, runPending, isPending };
}
