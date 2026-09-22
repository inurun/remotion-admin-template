import { describe, expect, it } from "vitest";
import { createBlankPageInput } from "@/app/features/page/lib/page-draft";
import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import type { NiconicoComment } from "@/_schemas/project/comments";
import {
  asCommentsPage,
  commentsEditorStructureKey,
  indexById,
  isCommentsEditorTextField,
  selectCommentsEditorStructure,
} from "./comments-editor.lib";

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
    comments: [comment(1, "うぽつ"), comment(2, "うぽつ")],
    commentGroups: [
      {
        id: "g1",
        commentIds: ["sm1:thread:main:1"],
        displayText: null,
        ttsIds: ["t1"],
      },
    ],
    commentScenes: [{ id: "s1", groupIds: ["g1"] }],
    tts: [tts("t1", "はい")],
    ...overrides,
  };
}

describe("comments editor structure", () => {
  it("ignores displayText, comment body, and tts text when selecting structure", () => {
    const source = page();
    const edited = page({
      comments: [comment(1, "編集"), comment(2, "うぽつ")],
      commentGroups: [
        {
          id: "g1",
          commentIds: ["sm1:thread:main:1"],
          displayText: "見出し",
          ttsIds: ["t1"],
        },
      ],
      commentScenes: [{ id: "s1", groupIds: ["g1"] }],
      tts: [tts("t1", "変更")],
    });
    expect(commentsEditorStructureKey(selectCommentsEditorStructure(source))).toBe(
      commentsEditorStructureKey(selectCommentsEditorStructure(edited)),
    );
  });

  it("changes structure key when group membership changes", () => {
    const source = page();
    const moved = page({
      commentGroups: [
        {
          id: "g1",
          commentIds: ["sm1:thread:main:1", "sm1:thread:main:2"],
          displayText: null,
          ttsIds: ["t1"],
        },
      ],
      commentScenes: [{ id: "s1", groupIds: ["g1"] }],
    });
    expect(commentsEditorStructureKey(selectCommentsEditorStructure(source))).not.toBe(
      commentsEditorStructureKey(selectCommentsEditorStructure(moved)),
    );
  });

  it("changes structure key when presentation changes", () => {
    const source = page();
    const triple = page({
      meta: {
        ...source.meta,
        presentation: "triple",
      },
    });
    expect(commentsEditorStructureKey(selectCommentsEditorStructure(source))).not.toBe(
      commentsEditorStructureKey(selectCommentsEditorStructure(triple)),
    );
  });

  it("does not treat leaf text paths as structure updates", () => {
    expect(isCommentsEditorTextField("commentGroups.0.displayText")).toBe(true);
    expect(isCommentsEditorTextField("comments.3.body")).toBe(true);
    expect(isCommentsEditorTextField("tts.1")).toBe(true);
    expect(isCommentsEditorTextField("tts.1.text")).toBe(true);
    expect(isCommentsEditorTextField("commentGroups")).toBe(false);
    expect(isCommentsEditorTextField("comments")).toBe(false);
    expect(isCommentsEditorTextField("tts")).toBe(false);
  });

  it("indexes ids in array order", () => {
    expect(indexById(["a", "b"])).toEqual({ a: 0, b: 1 });
  });

  it("narrows comments pages only", () => {
    const comments = page();
    expect(asCommentsPage(comments)).toBe(comments);
    expect(
      asCommentsPage(createBlankPageInput({ id: "main", title: "Main", type: "main" })),
    ).toBeNull();
  });
});
