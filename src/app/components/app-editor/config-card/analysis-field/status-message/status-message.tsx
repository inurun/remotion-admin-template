import type { ParsedTsmlState } from "@/app/components/app-editor/config-card/tsml-field/use-tsml-field";

export function StatusMessage({
  parsed,
}: {
  parsed: Pick<ParsedTsmlState, "status"> & { message?: string };
}) {
  if (parsed.status === "ready") {
    return null;
  }

  if (parsed.status === "error") {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {parsed.message}
      </div>
    );
  }

  const message = parsed.status === "loading" ? "Analysis loading..." : "No analysis";

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
