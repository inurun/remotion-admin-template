import { useCallback, useState } from "react";

export function useTtsTextFocusProviderValue() {
  const [pendingFocusTtsId, setPendingFocusTtsId] = useState<string | null>(null);

  const requestTextFocus = useCallback((ttsId: string) => {
    setPendingFocusTtsId(ttsId);
  }, []);

  const clearTextFocus = useCallback(() => {
    setPendingFocusTtsId(null);
  }, []);

  return {
    pendingFocusTtsId,
    requestTextFocus,
    clearTextFocus,
  };
}
