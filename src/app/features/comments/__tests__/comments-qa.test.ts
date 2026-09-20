import { describe, expect, it } from "vitest";
import { createBlankPageInput } from "@/app/features/page/lib/page-draft";
import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import type { NiconicoComment } from "@/_schemas/project/comments";
import {
  applyCommentGroupQaReplies,
  commentQaDraftHasInput,
  commentQaPosition,
  commitCommentsQaPage,
  filledCommentQaReplies,
  listUnansweredCommentGroupIds,
  moveCommentQaCursor,
  nextCommentQaGroupId,
  pendingCommentQaGroupIds,
  uncommittedCommentQaGroupIds,
} from "@/app/features/comments/comments-qa";

function tts(id: string, text: string, voiceName = "zunda"): TtsFormValues {
  return {
    id,
    provider: "voisona",
    text,
    readText: text,
    voiceName,
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
    },
    comments: [comment(1, "うぽつ"), comment(2, ""), comment(3, "質問")],
    commentGroups: [
      { id: "g1", commentIds: ["sm1:thread:main:1"], displayText: null, ttsIds: [] },
      { id: "g2", commentIds: ["sm1:thread:main:2"], displayText: null, ttsIds: ["t1"] },
      { id: "g3", commentIds: ["sm1:thread:main:3"], displayText: null, ttsIds: [] },
    ],
    tts: [tts("t1", "既存返信")],
    ...overrides,
  };
}

describe("comments qa", () => {
  it("extracts only groups with zero replies, including empty comment bodies", () => {
    expect(listUnansweredCommentGroupIds(page())).toEqual(["g1", "g3"]);
    expect(
      listUnansweredCommentGroupIds(
        page({
          commentGroups: [
            {
              id: "empty-body",
              commentIds: ["sm1:thread:main:2"],
              displayText: null,
              ttsIds: ["t1"],
            },
            {
              id: "empty-replies",
              commentIds: ["sm1:thread:main:1"],
              displayText: null,
              ttsIds: [],
            },
          ],
        }),
      ),
    ).toEqual(["empty-replies"]);
  });

  it("keeps the original target count after saves and skips saved groups", () => {
    const targetIds = ["g1", "g3", "g4"];
    expect(commentQaPosition(targetIds, "g3")).toEqual({ current: 2, total: 3 });
    const remaining = pendingCommentQaGroupIds(targetIds, new Set(["g1"]));
    expect(remaining).toEqual(["g3", "g4"]);
    expect(commentQaPosition(targetIds, remaining[0] ?? "")).toEqual({ current: 2, total: 3 });
    expect(listUnansweredCommentGroupIds(page())).toEqual(["g1", "g3"]);
  });

  it("moves among pending groups and keeps drafts keyed by group id", () => {
    const pending = ["g1", "g3"];
    expect(moveCommentQaCursor(pending, "g1", 1)).toBe("g3");
    expect(moveCommentQaCursor(pending, "g3", -1)).toBe("g1");
    expect(moveCommentQaCursor(pending, "g1", -1)).toBe("g1");
    const drafts = {
      g1: [tts("r1", "hello")],
      g3: [tts("r2", "")],
    };
    expect(moveCommentQaCursor(pending, "g3", -1)).toBe("g1");
    expect(drafts.g1?.[0]?.text).toBe("hello");
  });

  it("does not treat empty rows as input and drops them on apply", () => {
    const replies = [tts("r1", "  "), tts("r2", "返事"), tts("r3", "")];
    expect(commentQaDraftHasInput(replies)).toBe(true);
    expect(filledCommentQaReplies(replies).map((item) => item.id)).toEqual(["r2"]);
    const source = page();
    const applied = applyCommentGroupQaReplies(source, "g1", replies);
    expect(applied.ok).toBe(true);
    if (!applied.ok) {
      return;
    }
    expect(applied.page.commentGroups[0]?.ttsIds).toEqual(["r2"]);
    expect(source.commentGroups[0]?.ttsIds).toEqual([]);
    expect(source.tts.map((item) => item.id)).toEqual(["t1"]);
  });

  it("applies multiple replies and speakers without waiting for synthesis", () => {
    const applied = applyCommentGroupQaReplies(page(), "g1", [
      tts("r1", "one", "zunda"),
      tts("r2", "two", "metan"),
    ]);
    expect(applied.ok).toBe(true);
    if (!applied.ok) {
      return;
    }
    expect(applied.page.commentGroups[0]?.ttsIds).toEqual(["r1", "r2"]);
    expect(applied.page.tts.find((item) => item.id === "r1")).toMatchObject({
      text: "one",
      voiceName: "zunda",
    });
    expect(applied.page.tts.find((item) => item.id === "r2")).toMatchObject({
      text: "two",
      voiceName: "metan",
    });
    expect(applied.page.tts.every((item) => item.speech)).toBeTruthy();
  });

  it("does not overwrite existing replies, then retries with the same ids", () => {
    const source = page();
    const blocked = applyCommentGroupQaReplies(source, "g2", [tts("r1", "no")]);
    expect(blocked).toEqual({ ok: false, reason: "already-replied" });

    const first = applyCommentGroupQaReplies(source, "g1", [tts("r1", "first")]);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const retry = applyCommentGroupQaReplies(first.page, "g1", [tts("r1", "retry")]);
    expect(retry.ok).toBe(true);
    if (!retry.ok) {
      return;
    }
    expect(retry.page.commentGroups[0]?.ttsIds).toEqual(["r1"]);
    expect(retry.page.tts.filter((item) => item.id === "r1")).toHaveLength(1);
    expect(retry.page.tts.find((item) => item.id === "r1")?.text).toBe("retry");
  });

  it("commits the applied page to the editor store before save", () => {
    const applied = applyCommentGroupQaReplies(page(), "g1", [tts("r1", "saved")]);
    expect(applied.ok).toBe(true);
    if (!applied.ok) {
      return;
    }
    const order: string[] = [];
    commitCommentsQaPage({
      page: applied.page,
      writeForm: (next) => {
        order.push("form");
        expect(next.commentGroups[0]?.ttsIds).toEqual(["r1"]);
      },
      upsertPage: (pageId, next) => {
        order.push("store");
        expect(pageId).toBe("page");
        expect(next).toBe(applied.page);
      },
    });
    expect(order).toEqual(["form", "store"]);
  });

  it("advances past saved groups and closes after the last remaining target", () => {
    const targetIds = ["g1", "g3"];
    expect(nextCommentQaGroupId(targetIds, ["g3"], "g1")).toBe("g3");
    expect(pendingCommentQaGroupIds(targetIds, new Set(["g1", "g3"]))).toEqual([]);
    expect(
      uncommittedCommentQaGroupIds({ g1: [tts("r1", "x")], g3: [tts("r2", "")] }, ["g3"]),
    ).toEqual([]);
  });

  it("cannot start when every group already has replies", () => {
    expect(
      listUnansweredCommentGroupIds(
        page({
          commentGroups: [
            { id: "g1", commentIds: ["sm1:thread:main:1"], displayText: null, ttsIds: ["t1"] },
          ],
        }),
      ),
    ).toEqual([]);
  });
});
