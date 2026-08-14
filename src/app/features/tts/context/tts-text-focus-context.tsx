import { createContext, useContext, useLayoutEffect, useRef, type RefObject } from "react";
import { useTtsTextFocusProviderValue } from "@/app/features/tts/context/use-tts-text-focus-context";

const TtsTextFocusContext = createContext<ReturnType<typeof useTtsTextFocusProviderValue> | null>(
  null,
);

export function TtsTextFocusContextProvider({ children }: { children: React.ReactNode }) {
  const value = useTtsTextFocusProviderValue();
  return <TtsTextFocusContext.Provider value={value}>{children}</TtsTextFocusContext.Provider>;
}

export function useTtsTextFocus() {
  const context = useContext(TtsTextFocusContext);
  if (!context) {
    throw new Error("TtsTextFocusContext is missing");
  }
  return context;
}

export function useTtsTextFocusRef(ttsId: string): RefObject<HTMLTextAreaElement | null> {
  const { pendingFocusTtsId, clearTextFocus } = useTtsTextFocus();
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    if (pendingFocusTtsId !== ttsId) {
      return;
    }

    const textArea = ref.current;
    if (!textArea) {
      return;
    }

    textArea.focus();
    textArea.scrollIntoView({ behavior: "smooth", block: "center" });
    clearTextFocus();
  }, [clearTextFocus, pendingFocusTtsId, ttsId]);

  return ref;
}
