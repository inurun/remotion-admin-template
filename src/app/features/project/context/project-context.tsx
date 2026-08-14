import { createContext, useContext } from "react";
import { useProjectProviderValue } from "@/app/features/project/context/use-project-context";

const ProjectContext = createContext<ReturnType<typeof useProjectProviderValue> | null>(null);

export function ProjectContextProvider({ children }: { children: React.ReactNode }) {
  const value = useProjectProviderValue();
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("ProjectContext is missing");
  }
  return context;
}
