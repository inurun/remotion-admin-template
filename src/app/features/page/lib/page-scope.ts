export function shouldResetPageScopedState(
  previousPageId: string | null | undefined,
  nextPageId: string | null | undefined,
) {
  return previousPageId !== nextPageId;
}

export function valueAfterPageChange<T>(
  previousPageId: string | null | undefined,
  nextPageId: string | null | undefined,
  current: T,
  cleared: T,
): T {
  return shouldResetPageScopedState(previousPageId, nextPageId) ? cleared : current;
}
