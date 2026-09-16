import { describe, expect, it } from "vitest";
import { createBlankPageInput } from "@/app/features/page/lib/page-draft";
import { reconcileCommentReadings } from "@/app/features/comments/reconcile-comment-readings";
import {
  commentGroupDisplayText,
  listPageTtsInPlaybackOrder,
  resolveCommentGroups,
} from "@/app/features/comments/resolve-comment-groups";
import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";

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

function commentsPage(overrides: Partial<CommentsPageFormValues> = {}): CommentsPageFormValues {
  const blank = createBlankPageInput({
    id: "page",
    title: "Comments",
    type: "comments",
  });
  if (blank.type !== "comments") {
    throw new Error("expected comments page");
  }
  return { ...blank, ...overrides };
}

describe("comment group lookup", () => {
  it("resolves comments, reading, and replies from ids rather than tts array order", () => {
    const page = commentsPage({
      comments: [
        {
          id: "sm1:thread:main:1",
          threadId: "thread",
          fork: "main",
          no: 1,
          body: "うぽつ",
          vposMs: 0,
          postedAt: "2026-09-16T00:00:00.000Z",
        },
        {
          id: "sm1:thread:main:2",
          threadId: "thread",
          fork: "main",
          no: 2,
          body: "質問",
          vposMs: 1,
          postedAt: "2026-09-16T00:00:01.000Z",
        },
      ],
      commentGroups: [
        {
          id: "g1",
          commentIds: ["sm1:thread:main:2"],
          displayText: null,
          readingTtsId: "r2",
          ttsIds: ["t2"],
          minDurationSec: 3,
        },
        {
          id: "g2",
          commentIds: ["sm1:thread:main:1"],
          displayText: null,
          readingTtsId: "r1",
          ttsIds: ["t1"],
          minDurationSec: 3,
        },
      ],
      tts: [tts("t1", "a"), tts("r1", "うぽつ"), tts("t2", "b"), tts("r2", "質問")],
    });

    expect(listPageTtsInPlaybackOrder(page).map((item) => item.id)).toEqual([
      "r2",
      "t2",
      "r1",
      "t1",
    ]);
    expect(resolveCommentGroups(page)[0]?.comments.map((item) => item.id)).toEqual([
      "sm1:thread:main:2",
    ]);
    expect(
      commentGroupDisplayText(
        page.commentGroups[0]!,
        new Map(page.comments.map((item) => [item.id, item])),
      ),
    ).toBe("質問");
  });
});

describe("reconcileCommentReadings", () => {
  const comment = {
    id: "sm1:thread:main:1",
    threadId: "thread",
    fork: "main" as const,
    no: 1,
    body: "うぽつ",
    vposMs: 0,
    postedAt: "2026-09-16T00:00:00.000Z",
  };

  it("does not create readings for unadopted comments or when the reader is off", () => {
    const page = commentsPage({
      meta: {
        tags: [],
        commentReader: null,
        niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
      },
      comments: [comment],
      commentGroups: [
        {
          id: "g1",
          commentIds: [comment.id],
          displayText: null,
          readingTtsId: "r1",
          ttsIds: ["t1"],
          minDurationSec: 3,
        },
      ],
      tts: [tts("r1", "うぽつ"), tts("t1", "ありがとう", "himari")],
    });

    const next = reconcileCommentReadings(page);
    expect(next.commentGroups[0]?.readingTtsId).toBeNull();
    expect(next.tts.map((item) => item.id)).toEqual(["t1"]);
  });

  it("creates one reading per adopted group from display text", () => {
    const page = commentsPage({
      meta: {
        tags: [],
        commentReader: { provider: "voisona", voiceName: "zunda" },
        niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
      },
      comments: [comment, { ...comment, id: "sm1:thread:main:2", no: 2, body: "うぽつ" }],
      commentGroups: [
        {
          id: "g1",
          commentIds: [comment.id, "sm1:thread:main:2"],
          displayText: null,
          readingTtsId: null,
          ttsIds: ["t1"],
          minDurationSec: 3,
        },
      ],
      tts: [tts("t1", "ありがとう", "himari")],
    });

    const next = reconcileCommentReadings(page);
    expect(next.commentGroups[0]?.readingTtsId).toBeTruthy();
    expect(next.tts).toHaveLength(2);
    expect(next.tts.find((item) => item.id === next.commentGroups[0]?.readingTtsId)?.text).toBe(
      "うぽつ",
    );
    expect(next.tts.find((item) => item.id === "t1")?.voiceName).toBe("himari");
  });

  it("updates only the matching reading when display text or reader changes", () => {
    const page = commentsPage({
      meta: {
        tags: [],
        commentReader: { provider: "voisona", voiceName: "zunda" },
        niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
      },
      comments: [comment],
      commentGroups: [
        {
          id: "g1",
          commentIds: [comment.id],
          displayText: "まとめてお礼",
          readingTtsId: "r1",
          ttsIds: ["t1"],
          minDurationSec: 3,
        },
      ],
      tts: [tts("r1", "うぽつ"), tts("t1", "ありがとう", "himari")],
    });

    const withDisplay = reconcileCommentReadings(page);
    expect(withDisplay.tts.find((item) => item.id === "r1")?.text).toBe("まとめてお礼");
    expect(withDisplay.tts.find((item) => item.id === "t1")?.text).toBe("ありがとう");

    const withVoice = reconcileCommentReadings({
      ...withDisplay,
      meta: {
        ...withDisplay.meta,
        commentReader: { provider: "voisona", voiceName: "himari" },
      },
    });
    expect(withVoice.commentGroups[0]?.readingTtsId).toBe("r1");
    expect(withVoice.tts.find((item) => item.id === "r1")?.voiceName).toBe("himari");
    expect(withVoice.tts.find((item) => item.id === "t1")?.voiceName).toBe("himari");
  });

  it("keeps reading ids when groups are only reordered", () => {
    const second = { ...comment, id: "sm1:thread:main:2", no: 2, body: "質問" };
    const page = commentsPage({
      meta: {
        tags: [],
        commentReader: { provider: "voisona", voiceName: "zunda" },
        niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
      },
      comments: [comment, second],
      commentGroups: [
        {
          id: "g2",
          commentIds: [second.id],
          displayText: null,
          readingTtsId: "r2",
          ttsIds: [],
          minDurationSec: 3,
        },
        {
          id: "g1",
          commentIds: [comment.id],
          displayText: null,
          readingTtsId: "r1",
          ttsIds: [],
          minDurationSec: 3,
        },
      ],
      tts: [tts("r1", "うぽつ"), tts("r2", "質問")],
    });

    expect(reconcileCommentReadings(page).commentGroups.map((group) => group.readingTtsId)).toEqual(
      ["r2", "r1"],
    );
  });
});
