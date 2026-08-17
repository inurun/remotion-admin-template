import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { valueAfterPageChange } from "@/app/features/page/lib/page-scope";

type SelectedTtsContextValue = {
  selectedTtsId: string | null;
  selectTts: (ttsId: string | null) => void;
};

const SelectedTtsContext = createContext<SelectedTtsContextValue | null>(null);

export function SelectedTtsProvider({
  pageId,
  children,
}: {
  pageId: string | null;
  children: ReactNode;
}) {
  const [selectedTtsId, setSelectedTtsId] = useState<string | null>(null);
  const pageIdRef = useRef(pageId);

  useLayoutEffect(() => {
    const previousPageId = pageIdRef.current;
    pageIdRef.current = pageId;
    setSelectedTtsId((current) => valueAfterPageChange(previousPageId, pageId, current, null));
  }, [pageId]);

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
