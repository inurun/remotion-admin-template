/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */
import {
  createContext,
  useContext,
  type HfNode,
} from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import type { HfData } from "@/video-host/contract";

const ProjectContext = createContext<HfData | null>(null);

export const ProjectProvider = ({ children, value }: { children?: HfNode; value: HfData }) => {
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

  return context.schedules;
};
