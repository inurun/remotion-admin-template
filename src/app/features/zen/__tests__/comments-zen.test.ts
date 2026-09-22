import { describe, expect, it, vi } from "vitest";
import type { VoiceOption } from "@/_schemas";
import { createBlankPageInput } from "@/app/features/page/lib/page-draft";
import type { CommentsPageFormValues } from "@/app/features/page/model/page-form-schema";
import type { TtsFormValues } from "@/app/features/tts/model/tts-form-schema";
import { createAliasMap } from "@/app/features/zen/create-alias-map";
import {
  applyZenCommentsPage,
  parseZenCommentsPage,
  serializeZenCommentsPage,
} from "@/app/features/zen/comments-zen";
import { commentsEditFingerprint } from "@/app/features/comments/comment-operations";
import {
  createCommentsDraftStorage,
  toCommentsZenSnapshot,
} from "@/app/features/zen/comments-draft-storage";
import type { VoiceSettings } from "@/app/features/settings/storage/use-settings-store";

function voice(voiceName: string, displayName: string): VoiceOption {
  return { provider: "voicevox", voiceName, voiceVersion: "", displayName };
}

const { aliases } = createAliasMap([voice("3", "Zunda"), voice("14", "Himari")], {
  "voicevox::3::": { label: "Zunda", alias: "zunda", hotkey: "" },
  "voicevox::14::": { label: "Himari", alias: "himari", hotkey: "" },
} satisfies Record<string, VoiceSettings>);

function tts(id: string, text: string, voiceName: string): TtsFormValues {
  return {
    id,
    provider: "voicevox",
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

function commentsPage(): CommentsPageFormValues {
  const blank = createBlankPageInput({ id: "page", title: "Comments", type: "comments" });
  if (blank.type !== "comments") {
    throw new Error("expected comments");
  }
  return {
    ...blank,
    title: "Reply",
    meta: {
      tags: ["live"],
      niconico: { videoId: "sm1", fetchedAt: "2026-09-16T00:00:00.000Z" },
      presentation: "single",
    },
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
        body: "うぽつ",
        vposMs: 1000,
        postedAt: "2026-09-16T00:00:01.000Z",
        hidden: false,
      },
      {
        id: "sm1:thread:main:3",
        threadId: "thread",
        fork: "main",
        no: 3,
        body: "質問",
        vposMs: 2000,
        postedAt: "2026-09-16T00:00:02.000Z",
        hidden: false,
      },
    ],
    commentGroups: [
      {
        id: "g1",
        commentIds: ["sm1:thread:main:1"],
        displayText: null,
        ttsIds: ["t1"],
      },
      {
        id: "g2",
        commentIds: ["sm1:thread:main:3"],
        displayText: null,
        ttsIds: ["t2"],
      },
    ],
    tts: [tts("t1", "ありがとう", "3"), tts("t2", "Remotionだよ", "3")],
    commentScenes: [
      { id: "s1", groupIds: ["g1"] },
      { id: "s2", groupIds: ["g2"] },
    ],
  };
}

describe("comments zen", () => {
  it("round-trips quote blocks, blank splits, and tts ids", () => {
    const page = commentsPage();
    const source = serializeZenCommentsPage(page, aliases);
    expect(source).toContain("> [sm1:thread:main:1]");
    expect(source).toContain("{#tts:t1}");
    expect(source).not.toContain("reading");

    const parsed = parseZenCommentsPage(source, {
      aliases: aliases,
      insertedComments: page.comments,
      knownTtsIds: new Set(page.tts.map((item) => item.id)),
    });
    expect(parsed.errors).toEqual([]);
    expect(parsed.groups.map((group) => group.commentIds)).toEqual([
      ["sm1:thread:main:1"],
      ["sm1:thread:main:3"],
    ]);

    const applied = applyZenCommentsPage(page, parsed, aliases);
    expect(applied.commentGroups.map((group) => group.id)).toEqual(["g1", "g2"]);
    expect(applied.tts.map((item) => item.id)).toEqual(["t1", "t2"]);
  });

  it("splits continuous quotes by a blank line and merges without it", () => {
    const page = commentsPage();
    const split = parseZenCommentsPage(
      `> [sm1:thread:main:1] うぽつ\n\n> [sm1:thread:main:2] うぽつ\n`,
      {
        aliases: aliases,
        insertedComments: page.comments,
        knownTtsIds: new Set(),
      },
    );
    expect(split.groups).toHaveLength(2);

    const merged = parseZenCommentsPage(
      `> [sm1:thread:main:1] うぽつ\n> [sm1:thread:main:2] うぽつ\n`,
      {
        aliases: aliases,
        insertedComments: page.comments,
        knownTtsIds: new Set(),
      },
    );
    expect(merged.groups).toHaveLength(1);
    expect(merged.groups[0]?.commentIds).toEqual(["sm1:thread:main:1", "sm1:thread:main:2"]);
  });

  it("applies quoted text as an edit while keeping the comment id", () => {
    const page = commentsPage();
    const parsed = parseZenCommentsPage(
      `> [sm1:thread:main:1] 編集したうぽつ\n\n@zunda {#tts:t1}\nありがとう\n`,
      {
        aliases: aliases,
        insertedComments: page.comments,
        knownTtsIds: new Set(["t1", "t2"]),
      },
    );
    expect(parsed.errors).toEqual([]);
    const applied = applyZenCommentsPage(page, parsed, aliases);
    expect(applied.comments.find((item) => item.id === "sm1:thread:main:1")?.body).toBe(
      "編集したうぽつ",
    );
    expect(applied.commentGroups[0]?.commentIds).toEqual(["sm1:thread:main:1"]);
  });

  it("rejects duplicate comment ids and ambiguous bodies", () => {
    const page = commentsPage();
    const duplicate = parseZenCommentsPage(
      `> [sm1:thread:main:1] うぽつ\n> [sm1:thread:main:1] うぽつ\n`,
      {
        aliases: aliases,
        insertedComments: page.comments,
        knownTtsIds: new Set(),
      },
    );
    expect(duplicate.errors.length).toBeGreaterThan(0);

    const ambiguous = parseZenCommentsPage(`> うぽつ\n`, {
      aliases: aliases,
      insertedComments: page.comments,
      knownTtsIds: new Set(),
    });
    expect(ambiguous.errors.length).toBeGreaterThan(0);
  });

  it("keeps a moved reply id", () => {
    const page = commentsPage();
    const parsed = parseZenCommentsPage(
      `> [sm1:thread:main:3] 質問\n\n@zunda {#tts:t1}\nありがとう\n\n> [sm1:thread:main:1] うぽつ\n\n@zunda {#tts:t2}\nRemotionだよ\n`,
      {
        aliases: aliases,
        insertedComments: page.comments,
        knownTtsIds: new Set(["t1", "t2"]),
      },
    );
    const applied = applyZenCommentsPage(page, parsed, aliases);
    expect(applied.commentGroups[0]?.ttsIds).toEqual(["t1"]);
    expect(applied.commentGroups[1]?.ttsIds).toEqual(["t2"]);
  });

  it("treats --- as a scene break and reuses scene ids by group set", () => {
    const page = commentsPage();
    const source = serializeZenCommentsPage(page, aliases);
    expect(source).toContain("---");
    const parsed = parseZenCommentsPage(source, {
      aliases,
      insertedComments: page.comments,
      knownTtsIds: new Set(page.tts.map((item) => item.id)),
    });
    expect(parsed.errors).toEqual([]);
    expect(parsed.scenes.map((scene) => scene.groups.map((group) => group.commentIds))).toEqual([
      [["sm1:thread:main:1"]],
      [["sm1:thread:main:3"]],
    ]);
    const applied = applyZenCommentsPage(page, parsed, aliases);
    expect(applied.commentScenes.map((scene) => scene.id)).toEqual(["s1", "s2"]);

    const swapped = parseZenCommentsPage(
      `> [sm1:thread:main:3] 質問\n\n@zunda {#tts:t2}\nRemotionだよ\n\n---\n> [sm1:thread:main:1] うぽつ\n\n@zunda {#tts:t1}\nありがとう\n`,
      {
        aliases,
        insertedComments: page.comments,
        knownTtsIds: new Set(["t1", "t2"]),
      },
    );
    expect(
      applyZenCommentsPage(page, swapped, aliases).commentScenes.map((scene) => scene.id),
    ).toEqual(["s2", "s1"]);
  });

  it("rejects empty scenes and more than 3 groups", () => {
    const page = commentsPage();
    const empty = parseZenCommentsPage(`---\n> [sm1:thread:main:1] うぽつ\n`, {
      aliases,
      insertedComments: page.comments,
      knownTtsIds: new Set(),
    });
    expect(empty.errors.some((error) => error.message === "Empty comment scene.")).toBe(true);

    const overflow = parseZenCommentsPage(
      `> [sm1:thread:main:1]\n\n> [sm1:thread:main:2]\n\n> [sm1:thread:main:3]\n\n> [sm1:thread:main:4]\n`,
      {
        aliases,
        insertedComments: [
          ...page.comments,
          {
            id: "sm1:thread:main:4",
            threadId: "thread",
            fork: "main",
            no: 4,
            body: "extra",
            vposMs: 3000,
            postedAt: "2026-09-16T00:00:03.000Z",
            hidden: false,
          },
        ],
        knownTtsIds: new Set(),
      },
    );
    expect(overflow.errors.some((error) => error.message.includes("at most 3"))).toBe(true);
  });
});

describe("comments zen drafts", () => {
  it("stores empty source without deleting the key", () => {
    const values = new Map<string, string>();
    const drafts = createCommentsDraftStorage(
      () => ({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      }),
      vi.fn(),
    );
    const page = commentsPage();
    drafts.write("proj", "page", {
      version: 1,
      source: "",
      editedGroupSettings: {},
      updatedAt: "2026-09-16T00:00:00.000Z",
      draftRevision: 1,
      baseFingerprint: commentsEditFingerprint(page),
      baseSnapshot: toCommentsZenSnapshot(page),
      targetFingerprint: null,
    });
    expect(drafts.read("proj", "page").status).toBe("ok");
    const stored = drafts.read("proj", "page");
    expect(stored.status).toBe("ok");
    if (stored.status === "ok") {
      expect(stored.draft.source).toBe("");
    }
  });

  it("does not throw when storage is blocked", () => {
    const onError = vi.fn();
    const drafts = createCommentsDraftStorage(() => {
      throw new Error("blocked");
    }, onError);
    expect(drafts.read("p", "id").status).toBe("missing");
    expect(
      drafts.write("p", "id", {
        version: 1,
        source: "x",
        editedGroupSettings: {},
        updatedAt: "2026-09-16T00:00:00.000Z",
        draftRevision: 1,
        baseFingerprint: "a",
        baseSnapshot: toCommentsZenSnapshot(commentsPage()),
        targetFingerprint: null,
      }),
    ).toBe(false);
    expect(onError).toHaveBeenCalled();
  });

  it("keeps invalid json instead of overwriting on read", () => {
    const values = new Map<string, string>([["zen-comments-draft:v1:proj:page", "{not-json"]]);
    const drafts = createCommentsDraftStorage(
      () => ({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      }),
      vi.fn(),
    );
    expect(drafts.read("proj", "page")).toMatchObject({ status: "invalid" });
    expect(values.get("zen-comments-draft:v1:proj:page")).toBe("{not-json");
  });
});
