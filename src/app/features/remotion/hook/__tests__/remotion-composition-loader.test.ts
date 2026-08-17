import { describe, expect, it, vi } from "vitest";
import { createRemotionCompositionLoader } from "@/app/features/remotion/hook/remotion-composition-loader";

function FakeComposition() {
  return null;
}

describe("remotion composition loader", () => {
  it("imports once and keeps the cached component on later loads", async () => {
    const importComposition = vi.fn(async () => ({ Composition: FakeComposition }));
    const loader = createRemotionCompositionLoader(importComposition);

    expect(loader.peek()).toBeNull();

    const firstLoad = loader.load();
    const concurrentLoad = loader.load();
    expect(concurrentLoad).toBe(firstLoad);
    expect(importComposition).toHaveBeenCalledTimes(1);
    expect(loader.peek()).toBeNull();

    const component = await firstLoad;
    expect(component).toBe(FakeComposition);
    expect(loader.peek()).toBe(FakeComposition);

    await expect(loader.load()).resolves.toBe(FakeComposition);
    expect(importComposition).toHaveBeenCalledTimes(1);
    expect(loader.peek()).toBe(FakeComposition);
  });
});
