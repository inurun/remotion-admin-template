export function useTtsSynthesisStatus({
  status,
  error,
}: {
  status: "pending" | "failed" | undefined;
  error?: string;
}) {
  if (status === "pending") {
    return { title: "Synthesizing" };
  }
  if (status === "failed") {
    return { title: error || "Synthesis failed" };
  }
  return { title: undefined };
}
