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
};

const reading = {
  id: "r1",
  provider: "voisona" as const,
  text: "うぽつ",
  voiceName: "zunda",
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
      commentReader: { provider: "voisona" as const, voiceName: "zunda" },
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
    tts: [reading, reply],
    ...overrides,
  };
}

function savedTts(item: typeof reading | typeof reply) {
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
      meta: { tags: [], commentReader: null, niconico: null },
      comments: [],
      commentGroups: [],
      tts: [],
    };

    expect(pageFormSchema.parse(empty).type).toBe("comments");
    expect(savePageItemSchema.parse(empty).type).toBe("comments");
    expect(savedPageSchema.parse(empty)).not.toHaveProperty("durationSec");
  });

  it("accepts grouped comments with reading and replies in the same tts list", () => {
    const parsed = savedPageSchema.parse({
      ...commentsPage(),
      tts: [savedTts(reading), savedTts(reply)],
    });
    if (parsed.type !== "comments") {
      throw new Error("expected comments page");
    }
    expect(parsed.commentGroups[0]?.readingTtsId).toBe("r1");
    expect(parsed.tts.map((item) => item.id)).toEqual(["r1", "t1"]);
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
              readingTtsId: "r1",
              ttsIds: ["t1"],
              minDurationSec: 3,
            },
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      pageFormSchema.safeParse(
        commentsPage({
          commentGroups: [
            {
              id: "g1",
              commentIds: [comment.id],
              displayText: null,
              readingTtsId: "r1",
              ttsIds: ["r1"],
              minDurationSec: 3,
            },
          ],
          tts: [reading],
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
              readingTtsId: "r1",
              ttsIds: ["t1"],
              minDurationSec: 3,
            },
            {
              id: "g2",
              commentIds: [comment.id],
              displayText: null,
              readingTtsId: "r2",
              ttsIds: [],
              minDurationSec: 3,
            },
          ],
          tts: [
            reading,
            reply,
            { id: "r2", provider: "voisona", text: "うぽつ", voiceName: "zunda" },
          ],
        }),
      ).success,
    ).toBe(false);
  });

  it("rejects reading text or voice that does not match the page settings", () => {
    expect(
      pageFormSchema.safeParse(
        commentsPage({
          tts: [{ ...reading, text: "違う" }, reply],
        }),
      ).success,
    ).toBe(false);
    expect(
      pageFormSchema.safeParse(
        commentsPage({
          tts: [{ ...reading, voiceName: "other" }, reply],
        }),
      ).success,
    ).toBe(false);
  });

  it("rejects leftover comments when niconico is cleared", () => {
    expect(
      pageFormSchema.safeParse(
        commentsPage({
          meta: { tags: [], commentReader: null, niconico: null },
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
        tts: [savedTts(reading), savedTts(reply)],
      }),
    ).not.toHaveProperty("durationSec");
  });
});
