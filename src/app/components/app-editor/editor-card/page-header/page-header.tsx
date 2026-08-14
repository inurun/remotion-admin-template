import { PageSettingsDialog } from "@/app/components/app-editor/editor-card/page-header/page-settings-dialog/page-settings-dialog";
import { usePage } from "@/app/features/page";

export function PageHeader() {
  const { selectedPage } = usePage();
  const isTransition = selectedPage?.type === "transition";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 text-sm text-muted-foreground">
        <p className="text-[0.5rem] text-muted-foreground font-mono">ID: {selectedPage?.id}</p>
      </div>
      {isTransition ? null : <PageSettingsDialog />}
    </div>
  );
}
