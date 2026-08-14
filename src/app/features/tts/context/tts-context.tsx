import { createContext, useContext } from "react";
import { useTtsProviderValue } from "@/app/features/tts/context/use-tts-context";

const TtsContext = createContext<ReturnType<typeof useTtsProviderValue> | null>(null);

export function TtsContextProvider({ children }: { children: React.ReactNode }) {
  const value = useTtsProviderValue();
  return <TtsContext.Provider value={value}>{children}</TtsContext.Provider>;
}

export function useTts() {
  const context = useContext(TtsContext);
  if (!context) {
    throw new Error("TtsContext is missing");
  }
  return context;
}
