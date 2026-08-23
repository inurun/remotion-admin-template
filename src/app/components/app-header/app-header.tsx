import { Clapperboard, Save } from "lucide-react";
import { Button } from "@/_shared/components/ui/button";
import { SidebarTrigger } from "@/_shared/components/ui/sidebar";
import { BgmDialog } from "@/app/components/app-header/bgm-dialog/bgm-dialog";
import { NiconicoDialog } from "@/app/components/app-header/niconico-dialog/niconico-dialog";
import { RenderDialog } from "@/app/components/app-header/render-dialog/render-dialog";
import { useEditor } from "@/app/features/editor";
import { useRender } from "@/app/features/render";
import { ProjectSettingsDialog } from "@/app/components/app-header/project-settings-dialog/project-settings-dialog";
import { WeatherDialog } from "@/app/components/app-header/weather-dialog/weather-dialog";
import { useEditorSession } from "@/app/features/editor";
import { formatProjectTitleForUi } from "@/app/features/project/lib/project-title";

export function AppHeader() {
  const { save: onSave, isPending: saving } = useEditor();
  const title = useEditorSession((state) => formatProjectTitleForUi(state.project.meta.title));
  const { openRenderDialog } = useRender();

  return (
    <>
      <header className="grid shrink-0 gap-3 bg-background sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div className="sm:hidden">
          <SidebarTrigger />
        </div>
        <div className="grid gap-1">
          <h1 className="font-heading tracking-tight text-xl font-bold">{title}</h1>
        </div>
        <div className="flex items-center justify-end gap-2">
          <BgmDialog />
          <WeatherDialog />
          <NiconicoDialog />
          <ProjectSettingsDialog />
          <Button
            type="button"
            variant="secondary"
            title={saving ? "Saving" : "Save"}
            onClick={() => {
              void onSave();
            }}
          >
            <Save className={saving ? "animate-pulse" : undefined} />
            {saving ? "Saving" : "Save"}
          </Button>
          <Button type="button" title="Render" onClick={openRenderDialog}>
            <Clapperboard />
            Render
          </Button>
        </div>
      </header>
      <RenderDialog />
    </>
  );
}
