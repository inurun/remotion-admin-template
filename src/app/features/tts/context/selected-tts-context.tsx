import { createContext, useContext, type ReactNode } from "react";

type SelectedTtsContextValue = {
  ttsId: string;
};

const SelectedTtsContext = createContext<SelectedTtsContextValue | null>(null);

export function SelectedTtsContextProvider({
  ttsId,
  children,
}: {
  ttsId: string;
  children: ReactNode;
}) {
  return <SelectedTtsContext.Provider value={{ ttsId }}>{children}</SelectedTtsContext.Provider>;
}

export function useSelectedTts() {
  const context = useContext(SelectedTtsContext);
  if (!context) {
    throw new Error("SelectedTtsContext is missing");
  }
  return context;
}
