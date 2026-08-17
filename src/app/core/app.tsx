import { SidebarInset } from "@/_shared/components/ui/sidebar";
import { AppSidebar } from "@/app/components/app-sidebar/app-sidebar";
import { AppEditor } from "@/app/components/app-editor/app-editor";
import { ProjectContextProvider } from "@/app/features/project";
import { ProjectRouteProvider } from "@/app/features/project/context/project-route-context";
import { RenderContextProvider } from "@/app/features/render";
import { PublishContextProvider } from "@/app/features/publish";
import { SettingsContextProvider } from "@/app/features/settings";
import { EditorSessionStoreProvider, SavedProjectStoreProvider } from "@/app/features/editor";
import { useSelectedProjectQuery } from "@/app/features/project/swr/use-project-queries";
import { useProjectRoute } from "@/app/features/project/context/project-route-context";
import { AppHeader } from "../components/app-header/app-header";

function ProjectStores({ children }: { children: React.ReactNode }) {
  const { projectPath } = useProjectRoute();
  const { project, hasData } = useSelectedProjectQuery(projectPath);

  return (
    <SavedProjectStoreProvider
      key={`${projectPath ?? "none"}:${hasData ? "ready" : "empty"}`}
      initialProject={project}
    >
      <EditorSessionStoreProvider
        key={`${projectPath ?? "none"}:${hasData ? "ready" : "empty"}`}
        initialProject={project}
      >
        {children}
      </EditorSessionStoreProvider>
    </SavedProjectStoreProvider>
  );
}

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsContextProvider>
      <ProjectRouteProvider>
        <ProjectContextProvider>
          <ProjectStores>
            <PublishContextProvider>
              <RenderContextProvider>{children}</RenderContextProvider>
            </PublishContextProvider>
          </ProjectStores>
        </ProjectContextProvider>
      </ProjectRouteProvider>
    </SettingsContextProvider>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppSidebar>
        <SidebarInset>
          <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-2 p-2">
            <AppHeader />
            <AppEditor />
          </main>
        </SidebarInset>
      </AppSidebar>
    </AppProviders>
  );
}
