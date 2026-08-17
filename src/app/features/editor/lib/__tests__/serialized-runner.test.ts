import { describe, expect, it } from "vitest";
import { createSerializedRunner } from "@/app/features/editor/lib/serialized-runner";

describe("serialized runner", () => {
  it("does not start a second task until the first finishes", async () => {
    const run = createSerializedRunner();
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = run(async () => {
      events.push("start-1");
      await firstGate;
      events.push("end-1");
    });
    const second = run(async () => {
      events.push("start-2");
    });

    await Promise.resolve();
    expect(events).toEqual(["start-1"]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(["start-1", "end-1", "start-2"]);
  });
});
