import { describe, expect, it } from "vitest";
import {
  commentGroupSlot,
  createCommentScenesFromGroupIds,
  findCommentPresentationTriplet,
  listCenterCommentGroupIds,
  listCommentGroupPlaybackTts,
  listCommentPresentationTriplets,
  listPlaybackCommentGroups,
} from "@/server/features/project/comments-presentation";

function group(id: string, ttsIds: string[] = []) {
  return { id, ttsIds };
}

function scenesFrom(groups: Array<{ id: string }>, presentation: "single" | "triple") {
  return createCommentScenesFromGroupIds(
    groups.map((item) => item.id),
    presentation,
    (chunk) => `scene:${chunk.join(":")}`,
  );
}

describe("comment presentation scenes", () => {
  it("keeps single groups in scene order", () => {
    const groups = [group("a"), group("b")];
    expect(listCommentPresentationTriplets(groups, scenesFrom(groups, "single"), "single")).toEqual(
      [
        { left: null, center: group("a"), right: null },
        { left: null, center: group("b"), right: null },
      ],
    );
  });

  it("maps 1 to 3 groups in a scene to left/center/right slots", () => {
    expect(listCommentPresentationTriplets([], [], "triple")).toEqual([]);
    expect(
      listCommentPresentationTriplets([group("a")], [{ id: "s", groupIds: ["a"] }], "triple"),
    ).toEqual([{ left: null, center: group("a"), right: null }]);
    expect(
      listCommentPresentationTriplets(
        [group("a"), group("b")],
        [{ id: "s", groupIds: ["a", "b"] }],
        "triple",
      ),
    ).toEqual([{ left: null, center: group("a"), right: group("b") }]);
    expect(
      listCommentPresentationTriplets(
        [group("a"), group("b"), group("c")],
        [{ id: "s", groupIds: ["a", "b", "c"] }],
        "triple",
      ),
    ).toEqual([{ left: group("a"), center: group("b"), right: group("c") }]);
  });
});

describe("comment presentation targeting", () => {
  it("does not promote sides when the center has no tts", () => {
    const groups = [
      group("a", ["ta"]),
      group("b"),
      group("c", ["tc"]),
      group("d", ["td"]),
      group("e", ["te"]),
      group("f", ["tf"]),
    ];
    const scenes = scenesFrom(groups, "triple");

    expect(listPlaybackCommentGroups(groups, scenes, "triple").map((item) => item.id)).toEqual([
      "e",
    ]);
    expect(
      listCommentGroupPlaybackTts(groups, scenes, [{ id: "ta" }, { id: "te" }], "triple"),
    ).toEqual([{ id: "te" }]);
  });

  it("keeps side tts out of playback even when present", () => {
    const groups = [group("a", ["ta"]), group("b", ["tb"]), group("c", ["tc"])];
    const scenes = [{ id: "s", groupIds: ["a", "b", "c"] }];
    expect(
      listCommentGroupPlaybackTts(
        groups,
        scenes,
        [{ id: "ta" }, { id: "tb" }, { id: "tc" }],
        "triple",
      ).map((item) => item.id),
    ).toEqual(["tb"]);
  });

  it("uses saved scene membership after reorder", () => {
    const groups = [group("c"), group("a", ["ta"]), group("b", ["tb"])];
    const scenes = [{ id: "s", groupIds: ["c", "a", "b"] }];
    expect(listCenterCommentGroupIds(groups, scenes, "triple")).toEqual(["a"]);
    expect(commentGroupSlot(groups, scenes, "triple", "c")).toBe("left");
    expect(commentGroupSlot(groups, scenes, "triple", "a")).toBe("center");
    expect(commentGroupSlot(groups, scenes, "triple", "b")).toBe("right");
    expect(findCommentPresentationTriplet(groups, scenes, "triple", "a")).toEqual({
      left: group("c"),
      center: group("a", ["ta"]),
      right: group("b", ["tb"]),
    });
  });

  it("treats every single group as a center slot", () => {
    const groups = [group("a"), group("b", ["tb"])];
    const scenes = scenesFrom(groups, "single");
    expect(listCenterCommentGroupIds(groups, scenes, "single")).toEqual(["a", "b"]);
    expect(listPlaybackCommentGroups(groups, scenes, "single").map((item) => item.id)).toEqual([
      "b",
    ]);
    expect(commentGroupSlot(groups, scenes, "single", "a")).toBe("center");
  });
});
