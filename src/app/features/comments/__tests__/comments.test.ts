import { describe, expect, it } from "vitest";
import { createBlankPageInput } from "@/app/features/page/lib/page-draft";
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
  it("resolves comments and replies from ids rather than tts array order", () => {
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
          hidden: false,
        },
        {
          id: "sm1:thread:main:2",
          threadId: "thread",
          fork: "main",
          no: 2,
          body: "質問",
          vposMs: 1,
          postedAt: "2026-09-16T00:00:01.000Z",
          hidden: false,
        },
      ],
      commentGroups: [
        {
          id: "g1",
          commentIds: ["sm1:thread:main:2"],
          displayText: null,
          ttsIds: ["r2", "t2"],
        },
        {
          id: "g2",
          commentIds: ["sm1:thread:main:1"],
          displayText: null,
          ttsIds: ["r1", "t1"],
        },
      ],
      tts: [tts("t1", "a"), tts("r1", "うぽつ"), tts("t2", "b"), tts("r2", "質問")],
      commentScenes: [
        { id: "s1", groupIds: ["g1"] },
        { id: "s2", groupIds: ["g2"] },
      ],
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

  it("plays only center replies in triple presentation", () => {
    const page = commentsPage({
      meta: {
        tags: [],
        niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
        presentation: "triple",
      },
      comments: [
        {
          id: "sm1:thread:main:1",
          threadId: "thread",
          fork: "main",
          no: 1,
          body: "a",
          vposMs: 0,
          postedAt: "2026-09-16T00:00:00.000Z",
          hidden: false,
        },
        {
          id: "sm1:thread:main:2",
          threadId: "thread",
          fork: "main",
          no: 2,
          body: "b",
          vposMs: 1,
          postedAt: "2026-09-16T00:00:01.000Z",
          hidden: false,
        },
        {
          id: "sm1:thread:main:3",
          threadId: "thread",
          fork: "main",
          no: 3,
          body: "c",
          vposMs: 2,
          postedAt: "2026-09-16T00:00:02.000Z",
          hidden: false,
        },
      ],
      commentGroups: [
        { id: "g1", commentIds: ["sm1:thread:main:1"], displayText: null, ttsIds: ["r1"] },
        { id: "g2", commentIds: ["sm1:thread:main:2"], displayText: null, ttsIds: ["r2"] },
        { id: "g3", commentIds: ["sm1:thread:main:3"], displayText: null, ttsIds: ["r3"] },
      ],
      tts: [tts("r1", "a"), tts("r2", "b"), tts("r3", "c")],
      commentScenes: [{ id: "s1", groupIds: ["g1", "g2", "g3"] }],
    });
    expect(listPageTtsInPlaybackOrder(page).map((item) => item.id)).toEqual(["r2"]);
  });
});
