import { createContext, useContext } from "react";
import { usePublishProviderValue } from "@/app/features/publish/context/use-publish-context";

const PublishContext = createContext<ReturnType<typeof usePublishProviderValue> | null>(null);

export function PublishContextProvider({ children }: { children: React.ReactNode }) {
  const value = usePublishProviderValue();
  return <PublishContext.Provider value={value}>{children}</PublishContext.Provider>;
}

export function usePublish() {
  const context = useContext(PublishContext);
  if (!context) {
    throw new Error("PublishContext is missing");
  }
  return context;
}
