import { describe, expect, it } from "vitest";
import { createBlankPageInput } from "@/app/features/page/lib/page-draft";
import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import type { NiconicoComment } from "@/_schemas/project/comments";
import {
  applyCommentDrop,
  commentsStructureKey,
  insertCommentsAsGroups,
  insertReplyAfter,
  mergeCommentSnapshot,
  sortCommentGroupsByFirstCommentTime,
  moveGroup,
  moveReply,
  moveScene,
  setCommentBody,
  setGroupDisplayText,
  normalizeCommentGroupDisplayText,
} from "@/app/features/comments/comment-operations";
import {
  applyCommentsPageSettings,
  headerCheckboxState,
  nextFetchSelection,
  toggleAllUninserted,
} from "@/app/features/comments/apply-comments-settings";
import { tryParseNiconicoVideoId } from "@/app/features/comments/parse-niconico-video-id";

function tts(id: string, text: string): TtsFormValues {
  return {
    id,
    provider: "voisona",
    text,
    readText: text,
    voiceName: "zunda",
    voiceVersion: "",
    padBeforeSec: 0,
    padAfterSec: 0,
    volume: 1,
    synthesisSettings: null,
    speech: {},
  };
}

function comment(no: number, body: string): NiconicoComment {
  return {
    id: `sm1:thread:main:${no}`,
    threadId: "thread",
    fork: "main",
    no,
    body,
    vposMs: no * 1000,
    postedAt: "2026-09-16T00:00:00.000Z",
    hidden: false,
  };
}

function page(overrides: Partial<CommentsPageFormValues> = {}): CommentsPageFormValues {
  const blank = createBlankPageInput({ id: "page", title: "Comments", type: "comments" });
  if (blank.type !== "comments") {
    throw new Error("expected comments");
  }
  return {
    ...blank,
    meta: {
      tags: [],
      niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
      presentation: "single",
    },
    comments: [comment(1, "うぽつ"), comment(2, "うぽつ"), comment(3, "質問")],
    commentGroups: [
      {
        id: "g1",
        commentIds: ["sm1:thread:main:1"],
        displayText: null,
        ttsIds: ["t1"],
      },
      {
        id: "g2",
        commentIds: ["sm1:thread:main:2"],
        displayText: null,
        ttsIds: ["t2"],
      },
    ],
    commentScenes: [
      { id: "s1", groupIds: ["g1"] },
      { id: "s2", groupIds: ["g2"] },
    ],
    tts: [tts("t1", "ありがとう"), tts("t2", "よろしく")],
    ...overrides,
  };
}

describe("comment operations", () => {
  it("reorders groups inside a scene", () => {
    const source = page({
      commentScenes: [{ id: "s1", groupIds: ["g1", "g2"] }],
    });
    const next = moveGroup(source, "s1", "g1", 2);
    expect(next.commentScenes[0]?.groupIds).toEqual(["g2", "g1"]);
    expect(next.tts.map((item) => item.id)).toEqual(["t1", "t2"]);
  });

  it("sorts scenes by the spoken group first comment time and keeps equal times stable", () => {
    const source = page({
      comments: [
        { ...comment(1, "late"), vposMs: 3000 },
        { ...comment(2, "early"), vposMs: 1000 },
        { ...comment(3, "same-a"), vposMs: 2000 },
        { ...comment(4, "same-b"), vposMs: 2000 },
      ],
      commentGroups: [
        {
          id: "late",
          commentIds: ["sm1:thread:main:1", "sm1:thread:main:2"],
          displayText: "見出し",
          ttsIds: ["t1"],
        },
        {
          id: "same-a",
          commentIds: ["sm1:thread:main:3"],
          displayText: null,
          ttsIds: [],
        },
        {
          id: "same-b",
          commentIds: ["sm1:thread:main:4"],
          displayText: null,
          ttsIds: ["t2"],
        },
      ],
      commentScenes: [
        { id: "s-late", groupIds: ["late"] },
        { id: "s-a", groupIds: ["same-a"] },
        { id: "s-b", groupIds: ["same-b"] },
      ],
    });
    const originalIds = source.commentScenes.map((scene) => scene.id);
    const next = sortCommentGroupsByFirstCommentTime(source);
    expect(source.commentScenes.map((scene) => scene.id)).toEqual(originalIds);
    expect(next.commentScenes.map((scene) => scene.id)).toEqual(["s-a", "s-b", "s-late"]);
    expect(next.commentGroups.find((group) => group.id === "late")).toEqual({
      id: "late",
      commentIds: ["sm1:thread:main:1", "sm1:thread:main:2"],
      displayText: "見出し",
      ttsIds: ["t1"],
    });
    expect(sortCommentGroupsByFirstCommentTime(next)).toBe(next);
  });

  it("moves a reply only inside the same group", () => {
    const source = page({
      commentGroups: [
        {
          id: "g1",
          commentIds: ["sm1:thread:main:1"],
          displayText: null,
          ttsIds: ["t1", "t2"],
        },
      ],
      commentScenes: [{ id: "s1", groupIds: ["g1"] }],
      tts: [tts("t1", "ありがとう"), tts("t2", "よろしく")],
    });
    const next = moveReply(source, "t1", "g1", 2);
    expect(next.commentGroups[0]?.ttsIds).toEqual(["t2", "t1"]);
    expect(moveReply(source, "t1", "g2", 0)).toBe(source);
  });

  it("ignores no-op and mismatched drop kinds", () => {
    const source = page();
    expect(moveScene(source, "s1", 0)).toBe(source);
    expect(
      applyCommentDrop(
        source,
        { kind: "group", pageId: "page", sceneId: "s1", groupId: "g1", entityId: "g1" },
        { kind: "reply-slot", pageId: "page", sceneId: "s2", groupId: "g2", index: 0 },
      ),
    ).toBe(source);
    expect(
      applyCommentDrop(
        source,
        { kind: "group", pageId: "other", sceneId: "s1", groupId: "g1", entityId: "g1" },
        { kind: "reorder-group", pageId: "page", sceneId: "s1", index: 1 },
      ),
    ).toBe(source);
  });
});

describe("comment import helpers", () => {
  it("selects all uninserted comments on the first fetch", () => {
    const selected = nextFetchSelection({
      isFirstFetch: true,
      previousSelected: new Set(),
      previousCommentIds: new Set(),
      nextComments: [comment(1, "a"), comment(2, "b")],
      insertedIds: new Set(["sm1:thread:main:1"]),
    });
    expect([...selected]).toEqual(["sm1:thread:main:2"]);
  });

  it("keeps existing checks and selects only new comments on refresh", () => {
    const selected = nextFetchSelection({
      isFirstFetch: false,
      previousSelected: new Set(["sm1:thread:main:1"]),
      previousCommentIds: new Set(["sm1:thread:main:1", "sm1:thread:main:2"]),
      nextComments: [comment(1, "a"), comment(2, "b"), comment(3, "c")],
      insertedIds: new Set(),
    });
    expect(selected.has("sm1:thread:main:1")).toBe(true);
    expect(selected.has("sm1:thread:main:2")).toBe(false);
    expect(selected.has("sm1:thread:main:3")).toBe(true);
  });

  it("toggles header checkbox across the full uninserted set", () => {
    const ids = ["a", "b", "c"];
    expect(headerCheckboxState(3, 1)).toBe("some");
    const all = toggleAllUninserted(ids, new Set(["a"]));
    expect(all.size).toBe(3);
    expect(toggleAllUninserted(ids, all).size).toBe(0);
  });

  it("normalizes displayText on blur, not as blank spaces", () => {
    expect(normalizeCommentGroupDisplayText("  hello  ")).toBe("hello");
    expect(normalizeCommentGroupDisplayText("   ")).toBe(null);
    expect(normalizeCommentGroupDisplayText("")).toBe(null);
    expect(normalizeCommentGroupDisplayText(null)).toBe(null);
    const next = setGroupDisplayText(page(), "g1", "  見出し  ");
    expect(next.commentGroups[0]?.displayText).toBe("見出し");
  });

  it("edits comment text by id without changing identity, and refresh keeps the edit", () => {
    const source = page({
      meta: {
        tags: [],
        niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
        presentation: "single",
      },
    });
    const edited = setCommentBody(source, "sm1:thread:main:1", "編集したうぽつ");
    expect(edited.comments.find((item) => item.id === "sm1:thread:main:1")?.body).toBe(
      "編集したうぽつ",
    );
    expect(edited.commentGroups[0]?.commentIds).toEqual(["sm1:thread:main:1"]);

    const refreshed = mergeCommentSnapshot(edited, [
      comment(1, "うぽつ"),
      comment(2, "うぽつ"),
      comment(3, "質問"),
    ]);
    expect(refreshed.comments.find((item) => item.id === "sm1:thread:main:1")?.body).toBe(
      "編集したうぽつ",
    );
  });

  it("inserts a reply after the current tts in the same group", () => {
    const next = insertReplyAfter(page(), "t1", []);
    expect(next.commentGroups[0]?.ttsIds).toHaveLength(2);
    expect(next.commentGroups[0]?.ttsIds[0]).toBe("t1");
    expect(next.tts).toHaveLength(3);
    expect(next.commentGroups[0]?.ttsIds[1]).not.toBe("t1");
    expect(next.commentGroups[1]?.ttsIds).toEqual(["t2"]);
  });

  it("inserts each selected comment as its own group", () => {
    const blank = page({ commentGroups: [], commentScenes: [], tts: [] });
    const next = insertCommentsAsGroups(blank, ["sm1:thread:main:1", "sm1:thread:main:2"]);
    expect(next.commentGroups).toHaveLength(2);
    expect(next.commentGroups.map((group) => group.commentIds)).toEqual([
      ["sm1:thread:main:1"],
      ["sm1:thread:main:2"],
    ]);
    expect(next.commentGroups.every((group) => group.ttsIds.length === 0)).toBe(true);
    expect(next.commentScenes).toHaveLength(2);
    expect(next.commentScenes.every((scene) => scene.groupIds.length === 1)).toBe(true);
  });

  it("does not insert hidden comments", () => {
    const blank = page({
      comments: [
        comment(1, "うぽつ"),
        { ...comment(2, "うぽつ"), hidden: true },
        comment(3, "質問"),
      ],
      commentGroups: [],
      commentScenes: [],
      tts: [],
    });
    const next = insertCommentsAsGroups(blank, [
      "sm1:thread:main:1",
      "sm1:thread:main:2",
      "sm1:thread:main:3",
    ]);
    expect(next.commentGroups.map((group) => group.commentIds)).toEqual([
      ["sm1:thread:main:1"],
      ["sm1:thread:main:3"],
    ]);
  });

  it("keeps hidden across snapshot merge and skips it on refetch selection", () => {
    const hidden = { ...comment(2, "うぽつ"), hidden: true };
    const merged = mergeCommentSnapshot(
      page({ comments: [comment(2, "うぽつ")], commentGroups: [], commentScenes: [], tts: [] }),
      [hidden],
    );
    expect(merged.comments.find((item) => item.id === "sm1:thread:main:2")).toMatchObject({
      body: "うぽつ",
      hidden: true,
    });

    const selected = nextFetchSelection({
      isFirstFetch: true,
      previousSelected: new Set(),
      previousCommentIds: new Set(),
      nextComments: [comment(1, "a"), hidden, comment(3, "c")],
      insertedIds: new Set(),
    });
    expect(selected.has("sm1:thread:main:1")).toBe(true);
    expect(selected.has("sm1:thread:main:2")).toBe(false);
    expect(selected.has("sm1:thread:main:3")).toBe(true);
  });

  it("saves settings without inserting and detects structure conflicts", () => {
    const current = page();
    const opened = commentsStructureKey(current);
    const saved = applyCommentsPageSettings(current, opened, {
      title: "Next",
      tags: ["tag"],
      videoId: "sm1",
      snapshot: current.comments,
      fetchedAt: "2026-09-16T01:00:00.000Z",
      insertIds: [],
      presentation: "triple",
    });
    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.page.commentGroups).toHaveLength(2);
      expect(saved.page.title).toBe("Next");
      expect(saved.page.meta.presentation).toBe("triple");
      expect(saved.page.commentGroups[1]?.ttsIds).toEqual(["t2"]);
    }
    const conflicted = applyCommentsPageSettings(moveScene(current, "s1", 2), opened, {
      title: "Next",
      tags: [],
      videoId: "sm1",
      snapshot: null,
      fetchedAt: null,
      insertIds: [],
      presentation: "single",
    });
    expect(conflicted).toEqual({ ok: false, reason: "conflict" });
  });

  it("parses equivalent niconico ids", () => {
    expect(tryParseNiconicoVideoId("SM9")).toBe("sm9");
    expect(tryParseNiconicoVideoId("https://www.nicovideo.jp/watch/sm9")).toBe("sm9");
    expect(tryParseNiconicoVideoId("https://nico.ms/sm9")).toBe("sm9");
  });

  it("inserts selected comments into trailing scenes without filling existing ones", () => {
    const current = page();
    const opened = commentsStructureKey(current);
    const saved = applyCommentsPageSettings(current, opened, {
      title: current.title,
      tags: [],
      videoId: "sm1",
      snapshot: current.comments,
      fetchedAt: "2026-09-16T01:00:00.000Z",
      insertIds: ["sm1:thread:main:3"],
      presentation: "single",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }
    expect(saved.page.commentGroups.map((group) => group.commentIds)).toEqual([
      ["sm1:thread:main:1"],
      ["sm1:thread:main:2"],
      ["sm1:thread:main:3"],
    ]);
    expect(saved.page.commentScenes.map((scene) => scene.groupIds)).toEqual([
      ["g1"],
      ["g2"],
      [saved.page.commentGroups[2]?.id],
    ]);
  });
});
