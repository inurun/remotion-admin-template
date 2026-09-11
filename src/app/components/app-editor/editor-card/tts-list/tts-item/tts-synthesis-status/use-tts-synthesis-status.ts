export function useTtsSynthesisStatus({
  status,
  error,
}: {
  status: "analyzing" | "pending" | "failed" | undefined;
  error?: string;
}) {
  if (status === "analyzing") {
    return { title: "Analyzing" };
  }
  if (status === "pending") {
    return { title: "Synthesizing" };
  }
  if (status === "failed") {
    return { title: error || "Synthesis failed" };
  }
  return { title: undefined };
}
