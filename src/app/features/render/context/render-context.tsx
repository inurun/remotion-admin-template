import { createContext, useContext } from "react";
import { useRenderProviderValue } from "@/app/features/render/context/use-render-context";

const RenderContext = createContext<ReturnType<typeof useRenderProviderValue> | null>(null);

export function RenderContextProvider({ children }: { children: React.ReactNode }) {
  const value = useRenderProviderValue();
  return <RenderContext.Provider value={value}>{children}</RenderContext.Provider>;
}

export function useRender() {
  const context = useContext(RenderContext);
  if (!context) {
    throw new Error("RenderContext is missing");
  }
  return context;
}
