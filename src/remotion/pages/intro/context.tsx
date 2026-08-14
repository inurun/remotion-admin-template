import { createContext, useContext } from "react";
import { SavedPage } from "@/_schemas";

export type IntroPageProps = {
  page: SavedPage;
};

export function useIntroPageProviderValue(page: IntroPageProps) {
  return {
    ...page,
  };
}

const IntroPageContext = createContext<ReturnType<typeof useIntroPageProviderValue> | null>(null);

export function IntroPageContextProvider({
  page,
  children,
}: IntroPageProps & {
  children: React.ReactNode;
}) {
  const value = useIntroPageProviderValue({ page });
  return <IntroPageContext.Provider value={value}>{children}</IntroPageContext.Provider>;
}

export function useIntroPageContext() {
  const context = useContext(IntroPageContext);
  if (!context) {
    throw new Error("IntroPageContext is missing");
  }
  return context;
}
