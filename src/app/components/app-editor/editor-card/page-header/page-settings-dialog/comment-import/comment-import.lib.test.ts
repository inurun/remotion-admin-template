import { describe, expect, it } from "vitest";
import { formatVposMs, overlayCommentHidden } from "./comment-import.lib";
import type { NiconicoComment } from "@/_schemas/project/comments";

function comment(no: number, hidden = false): NiconicoComment {
  return {
    id: `sm1:thread:main:${no}`,
    threadId: "thread",
    fork: "main",
    no,
    body: "うぽつ",
    vposMs: no * 1000,
    postedAt: "2026-09-16T00:00:00.000Z",
    hidden,
  };
}

describe("comment import lib", () => {
  it("formats vpos as m:ss", () => {
    expect(formatVposMs(0)).toBe("0:00");
    expect(formatVposMs(65_000)).toBe("1:05");
  });

  it("keeps later overlay hidden flags on refetch", () => {
    const fetched = [comment(1), comment(2), comment(3)];
    const overlaid = overlayCommentHidden(fetched, [[comment(1)], [comment(2, true)]]);
    expect(overlaid.map((item) => [item.id, item.hidden])).toEqual([
      ["sm1:thread:main:1", false],
      ["sm1:thread:main:2", true],
      ["sm1:thread:main:3", false],
    ]);
  });
});
