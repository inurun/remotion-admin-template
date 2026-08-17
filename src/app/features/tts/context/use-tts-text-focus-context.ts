import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { valueAfterPageChange } from "@/app/features/page/lib/page-scope";

export function useTtsTextFocusProviderValue(pageId: string | null) {
  const [pendingFocusTtsId, setPendingFocusTtsId] = useState<string | null>(null);
  const pageIdRef = useRef(pageId);

  useLayoutEffect(() => {
    const previousPageId = pageIdRef.current;
    pageIdRef.current = pageId;
    setPendingFocusTtsId((current) => valueAfterPageChange(previousPageId, pageId, current, null));
  }, [pageId]);

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
