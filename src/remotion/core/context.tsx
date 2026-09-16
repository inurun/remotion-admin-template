import { createContext, useContext, type PropsWithChildren } from "react";
import type { SavedProject, SavedSchedules, SavedTimeline } from "@/_schemas";

export type RemotionCompositionProps = {
  project: SavedProject;
  timeline: SavedTimeline;
  schedules?: SavedSchedules;
} & Record<string, unknown>;

export type RemotionProjectInput = RemotionCompositionProps;

const ProjectContext = createContext<RemotionProjectInput | null>(null);

const EMPTY_SCHEDULES: SavedSchedules = { items: [] };

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

export const useSchedules = () => {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useSchedules must be used within ProjectProvider.");
  }

  return context.schedules ?? EMPTY_SCHEDULES;
};
