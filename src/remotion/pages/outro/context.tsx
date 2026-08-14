import { createContext, useContext } from "react";
import type { SavedPage } from "@/_schemas";

export type OutroPageProps = {
  page: SavedPage;
};

export function useOutroPageProviderValue({ page }: OutroPageProps) {
  return { page };
}

const OutroPageContext = createContext<ReturnType<typeof useOutroPageProviderValue> | null>(null);

export function OutroPageContextProvider({
  page,
  children,
}: OutroPageProps & {
  children: React.ReactNode;
}) {
  const value = useOutroPageProviderValue({ page });
  return <OutroPageContext.Provider value={value}>{children}</OutroPageContext.Provider>;
}

export function useOutroPageContext() {
  const context = useContext(OutroPageContext);
  if (!context) {
    throw new Error("OutroPageContext is missing");
  }
  return context;
}
