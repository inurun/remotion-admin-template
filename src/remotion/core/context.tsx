import { createContext, useContext, type PropsWithChildren } from "react";
import type { SavedProject, SavedTimeline } from "@/_schemas";

export type RemotionProjectInput = {
  project: SavedProject;
  timeline: SavedTimeline;
};

const ProjectContext = createContext<RemotionProjectInput | null>(null);

export const ProjectProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: RemotionProjectInput }>) => {
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useProject must be used within ProjectProvider.");
  }

  return context.project;
};

export const useTimeline = () => {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useTimeline must be used within ProjectProvider.");
  }

  return context.timeline;
};
