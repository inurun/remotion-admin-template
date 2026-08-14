import { createContext, useContext, type ReactNode } from "react";

type SelectedTtsContextValue = {
  selectedTtsIndex: number;
};

const SelectedTtsContext = createContext<SelectedTtsContextValue | null>(null);

export function SelectedTtsContextProvider({
  ttsIndex,
  children,
}: {
  ttsIndex: number;
  children: ReactNode;
}) {
  return (
    <SelectedTtsContext.Provider value={{ selectedTtsIndex: ttsIndex }}>
      {children}
    </SelectedTtsContext.Provider>
  );
}

export function useSelectedTts() {
  const context = useContext(SelectedTtsContext);
  if (!context) {
    throw new Error("SelectedTtsContext is missing");
  }
  return context;
}
