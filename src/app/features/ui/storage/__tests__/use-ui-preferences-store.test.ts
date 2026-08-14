import { beforeEach, describe, expect, it, vi } from "vitest";

type StorageMock = {
  clear: () => void;
  getItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

function createLocalStorageMock(initial: Record<string, string> = {}): StorageMock {
  const store = new Map(Object.entries(initial));

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: () => {
      store.clear();
    },
  };
}

async function importStoreWithStorage(storage: StorageMock) {
  vi.resetModules();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });
  return import("../use-ui-preferences-store");
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("useUiPreferencesStore", () => {
  it("uses the default sidebar state when no persisted value exists", async () => {
    const storage = createLocalStorageMock();
    const { hasStoredUiPreferences, useUiPreferencesStore } = await importStoreWithStorage(storage);

    expect(hasStoredUiPreferences()).toBe(false);
    expect(useUiPreferencesStore.getState().sidebarOpen).toBe(true);
  });

  it("hydrates sidebarOpen from localStorage", async () => {
    const { UI_PREFERENCES_STORAGE_KEY, useUiPreferencesStore } = await importStoreWithStorage(
      createLocalStorageMock({
        "remotion-voisona-ui-preferences": JSON.stringify({
          state: { sidebarOpen: false },
          version: 0,
        }),
      }),
    );

    expect(useUiPreferencesStore.getState().sidebarOpen).toBe(false);
    expect(useUiPreferencesStore.persist.getOptions().name).toBe(UI_PREFERENCES_STORAGE_KEY);
  });

  it("persists sidebarOpen updates", async () => {
    const storage = createLocalStorageMock();
    const { UI_PREFERENCES_STORAGE_KEY, useUiPreferencesStore } =
      await importStoreWithStorage(storage);

    useUiPreferencesStore.getState().setSidebarOpen(false);

    expect(storage.setItem).toHaveBeenCalledWith(
      UI_PREFERENCES_STORAGE_KEY,
      expect.stringContaining('"sidebarOpen":false'),
    );
  });
});
