import { createContext, useContext, type ReactNode } from "react";

type CommentsZenContextValue = {
  openZen: (groupId?: string) => void;
};

const CommentsZenContext = createContext<CommentsZenContextValue | null>(null);

export function CommentsZenProvider({
  value,
  children,
}: {
  value: CommentsZenContextValue;
  children: ReactNode;
}) {
  return <CommentsZenContext.Provider value={value}>{children}</CommentsZenContext.Provider>;
}

export function useCommentZen() {
  const context = useContext(CommentsZenContext);
  if (!context) {
    return { openZen: () => undefined };
  }
  return context;
}
