import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getProjectPathFromRoute,
  parseProjectRoute,
  type ProjectRoute,
} from "@/app/features/project/lib/project-route";

type ProjectRouteContextValue = {
  pathname: string;
  route: ProjectRoute;
  projectPath: string | null;
  navigate: (href: string, options?: { replace?: boolean }) => void;
};

const ProjectRouteContext = createContext<ProjectRouteContextValue | null>(null);

export function ProjectRouteProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((href: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState({}, "", href);
    } else {
      window.history.pushState({}, "", href);
    }
    setPathname(href.split("?")[0] ?? href);
  }, []);

  const route = useMemo(() => parseProjectRoute(pathname), [pathname]);
  const value = useMemo<ProjectRouteContextValue>(
    () => ({
      pathname,
      route,
      projectPath: getProjectPathFromRoute(route),
      navigate,
    }),
    [navigate, pathname, route],
  );

  return <ProjectRouteContext.Provider value={value}>{children}</ProjectRouteContext.Provider>;
}

export function useProjectRoute() {
  const context = useContext(ProjectRouteContext);
  if (!context) {
    throw new Error("ProjectRoute is missing");
  }
  return context;
}

export function useSelectedPageId() {
  const { route } = useProjectRoute();
  return route.type === "page" ? route.pageId : null;
}
