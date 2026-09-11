import { CircleAlert, LoaderCircle } from "lucide-react";
import { useTtsSynthesisStatus } from "./use-tts-synthesis-status";

export function TtsSynthesisStatus({
  status,
  error,
}: {
  status: "pending" | "failed" | undefined;
  error?: string;
}) {
  const { title } = useTtsSynthesisStatus({ status, error });
  if (status === "pending") {
    return (
      <span title={title} className="inline-flex shrink-0">
        <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span title={title} className="inline-flex shrink-0">
        <CircleAlert className="size-3.5 text-destructive" />
      </span>
    );
  }
  return null;
}
