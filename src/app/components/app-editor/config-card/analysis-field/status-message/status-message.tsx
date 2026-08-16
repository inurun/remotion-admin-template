export function StatusMessage({
  parsed,
}: {
  parsed: { status: "empty" | "error" | "ready" } & { message?: string };
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

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
      No analysis
    </div>
  );
}
