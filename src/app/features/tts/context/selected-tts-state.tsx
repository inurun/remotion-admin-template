import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SelectedTtsContextValue = {
  selectedTtsId: string | null;
  selectTts: (ttsId: string | null) => void;
};

const SelectedTtsContext = createContext<SelectedTtsContextValue | null>(null);

export function SelectedTtsProvider({ children }: { children: ReactNode }) {
  const [selectedTtsId, setSelectedTtsId] = useState<string | null>(null);
  const value = useMemo(
    () => ({
      selectedTtsId,
      selectTts: setSelectedTtsId,
    }),
    [selectedTtsId],
  );

  return <SelectedTtsContext.Provider value={value}>{children}</SelectedTtsContext.Provider>;
}

export function useSelectedTtsState() {
  const context = useContext(SelectedTtsContext);
  if (!context) {
    throw new Error("SelectedTts is missing");
  }
  return context;
}
