export function useRenderProgress(progress: number) {
  return {
    value: Math.min(100, Math.max(0, Math.round(progress))),
  };
}
