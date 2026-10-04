import { describe, expect, it, vi } from "vitest";
import { createMountQueue } from "../mount-queue";

function deferredMount() {
  const resolvers: Array<() => void> = [];
  const mount = vi.fn(
    (_data: { title: string }) => new Promise<void>((resolve) => resolvers.push(resolve)),
  );
  const finishNext = async () => {
    resolvers.shift()?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { mount, finishNext };
}

describe("createMountQueue", () => {
  it("skips data identical to what is mounted and still resolves", async () => {
    const mount = vi.fn(async () => {});
    const queue = createMountQueue(mount);
    await queue.schedule({ title: "a" });
    await expect(queue.schedule({ title: "a" })).resolves.toBeUndefined();
    expect(mount).toHaveBeenCalledTimes(1);
    await queue.schedule({ title: "b" });
    expect(mount).toHaveBeenCalledTimes(2);
  });

  it("skips data identical to the mount in flight", async () => {
    const { mount, finishNext } = deferredMount();
    const queue = createMountQueue(mount);
    const first = queue.schedule({ title: "a" });
    const duplicate = queue.schedule({ title: "a" });
    await finishNext();
    await Promise.all([first, duplicate]);
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it("collapses a burst into one mount of the newest data", async () => {
    const { mount, finishNext } = deferredMount();
    const queue = createMountQueue(mount);
    void queue.schedule({ title: "a" });
    void queue.schedule({ title: "b" });
    void queue.schedule({ title: "c" });
    const last = queue.schedule({ title: "c" });
    await finishNext();
    await finishNext();
    await last;
    expect(mount.mock.calls.map(([data]) => data.title)).toEqual(["a", "c"]);
    expect(queue.isIdle()).toBe(true);
  });

  it("drops a queued change when the data returns to the mount in flight", async () => {
    const { mount, finishNext } = deferredMount();
    const queue = createMountQueue(mount);
    void queue.schedule({ title: "a" });
    void queue.schedule({ title: "b" });
    const back = queue.schedule({ title: "a" });
    await finishNext();
    await back;
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it("retries data whose mount failed", async () => {
    const mount = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(undefined);
    const queue = createMountQueue(mount);
    await expect(queue.schedule({ title: "a" })).rejects.toThrow("boom");
    await queue.schedule({ title: "a" });
    expect(mount).toHaveBeenCalledTimes(2);
  });
});
