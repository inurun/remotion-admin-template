import { useEffect } from "react";
import { useEditorSession } from "@/app/features/editor/store/editor-session-store-context";
import { useProjectRoute } from "@/app/features/project/context/project-route-context";
import { useSelectedProjectQuery } from "@/app/features/project/swr/use-project-queries";
import {
  rememberLastPageId,
  resolveProjectRouteRedirect,
} from "@/app/features/project/lib/project-route";

export function useProjectRouteRedirect() {
  const { route, projectPath, navigate } = useProjectRoute();
  const sequenceOrder = useEditorSession((state) => state.sequenceOrder);
  const { hasData } = useSelectedProjectQuery(projectPath);

  useEffect(() => {
    if (!projectPath) {
      return;
    }

    const decision = resolveProjectRouteRedirect({
      route,
      sequenceOrder,
      hasProjectData: hasData,
    });
    if (decision.action === "navigate") {
      navigate(decision.href, { replace: true });
      return;
    }
    if (decision.action === "remember") {
      rememberLastPageId(projectPath, decision.pageId);
    }
  }, [hasData, navigate, projectPath, route, sequenceOrder]);
}
