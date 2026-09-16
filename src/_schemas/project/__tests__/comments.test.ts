import { describe, expect, it } from "vitest";
import { savedPageSchema } from "@/_schemas/project/page";
import { pageFormSchema } from "@/app/features/page/model/page-form-schema";
import { savePageItemSchema } from "@/server/features/project/contract";

const comment = {
  id: "sm1:thread:main:1",
  threadId: "thread",
  fork: "main" as const,
  no: 1,
  body: "うぽつ",
  vposMs: 1000,
  postedAt: "2026-09-16T00:00:00.000Z",
  hidden: false,
};

const reply = {
  id: "t1",
  provider: "voisona" as const,
  text: "ありがとう",
  voiceName: "himari",
};

function commentsPage(overrides: Record<string, unknown> = {}) {
  return {
    id: "page",
    title: "Comments",
    type: "comments" as const,
    padBeforeSec: 0,
    padAfterSec: 0,
    richText: null,
    meta: {
      tags: [],
      niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
    },
    comments: [comment],
    commentGroups: [
      {
        id: "g1",
        commentIds: [comment.id],
        displayText: null,
        ttsIds: ["t1"],
      },
    ],
    tts: [reply],
    ...overrides,
  };
}

function savedTts(item: typeof reply) {
  return {
    ...item,
    audio: { status: "analyzing" as const, analysisKey: "k" },
    speech: {},
  };
}

describe("comments page schema", () => {
  it("accepts an empty comments page with niconico unset", () => {
    const empty = {
      id: "page",
      title: "",
      type: "comments",
      padBeforeSec: 0,
      padAfterSec: 0,
      richText: null,
      meta: { tags: [], niconico: null },
      comments: [],
      commentGroups: [],
      tts: [],
    };

    expect(pageFormSchema.parse(empty).type).toBe("comments");
    expect(savePageItemSchema.parse(empty).type).toBe("comments");
    expect(savedPageSchema.parse(empty)).not.toHaveProperty("durationSec");
  });

  it("defaults hidden to false", () => {
    const parsed = pageFormSchema.parse(commentsPage());
    if (parsed.type !== "comments") {
      throw new Error("expected comments page");
    }
    expect(parsed.comments[0]?.hidden).toBe(false);
  });

  it("rejects hidden comments in a group", () => {
    expect(
      pageFormSchema.safeParse(
        commentsPage({
          comments: [{ ...comment, hidden: true }],
        }),
      ).success,
    ).toBe(false);
  });

  it("accepts grouped comments with replies in the same tts list", () => {
    const parsed = savedPageSchema.parse({
      ...commentsPage(),
      tts: [savedTts(reply)],
    });
    if (parsed.type !== "comments") {
      throw new Error("expected comments page");
    }
    expect(parsed.commentGroups[0]?.ttsIds).toEqual(["t1"]);
    expect(parsed.tts.map((item) => item.id)).toEqual(["t1"]);
  });

  it("rejects broken references and orphan tts", () => {
    expect(pageFormSchema.safeParse(commentsPage({ commentGroups: [] })).success).toBe(false);
    expect(
      pageFormSchema.safeParse(
        commentsPage({
          commentGroups: [
            {
              id: "g1",
              commentIds: [],
              displayText: null,
              ttsIds: ["t1"],
            },
          ],
        }),
      ).success,
    ).toBe(false);
  });

  it("rejects a second group using the same comment", () => {
    expect(
      pageFormSchema.safeParse(
        commentsPage({
          comments: [comment, { ...comment, id: "sm1:thread:main:2", no: 2, body: "質問" }],
          commentGroups: [
            {
              id: "g1",
              commentIds: [comment.id],
              displayText: null,
              ttsIds: ["t1"],
            },
            {
              id: "g2",
              commentIds: [comment.id],
              displayText: null,
              ttsIds: [],
            },
          ],
          tts: [reply],
        }),
      ).success,
    ).toBe(false);
  });

  it("rejects leftover comments when niconico is cleared", () => {
    expect(
      pageFormSchema.safeParse(
        commentsPage({
          meta: { tags: [], niconico: null },
          commentGroups: [],
          tts: [],
        }),
      ).success,
    ).toBe(false);
  });

  it("does not persist page durationSec", () => {
    expect(
      savedPageSchema.parse({
        ...commentsPage(),
        durationSec: 9,
        tts: [savedTts(reply)],
      }),
    ).not.toHaveProperty("durationSec");
  });
});
