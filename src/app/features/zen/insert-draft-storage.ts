type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createInsertDraftStorage(getStorage: () => DraftStorage, onError: () => void) {
  const key = (projectPath: string) => `zen-insert-draft:${projectPath}`;
  return {
    read(projectPath: string) {
      try {
        return getStorage().getItem(key(projectPath)) ?? "";
      } catch {
        onError();
        return "";
      }
    },
    write(projectPath: string, source: string) {
      try {
        if (source) getStorage().setItem(key(projectPath), source);
        else getStorage().removeItem(key(projectPath));
      } catch {
        onError();
      }
    },
  };
}
