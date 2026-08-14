import { createContext, useContext, type PropsWithChildren } from "react";
import type { SavedProject } from "@/_schemas";

const ProjectContext = createContext<SavedProject | null>(null);

export const ProjectProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: SavedProject }>) => {
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useProject must be used within ProjectProvider.");
  }

  return context;
};
