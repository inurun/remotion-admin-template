import { beforeEach, describe, expect, it, vi } from "vitest";
import { createG2pItem } from "@/_schemas/__tests__/g2p-fixture";
import { dictionaryApp } from "../route";

const mocks = vi.hoisted(() => ({
  listDictionary: vi.fn(),
  getDictionaryEntry: vi.fn(),
  createDictionaryEntry: vi.fn(),
  updateDictionaryEntry: vi.fn(),
  deleteDictionaryEntry: vi.fn(),
  previewDictionaryEntry: vi.fn(),
}));

vi.mock("../use-case", () => mocks);

const entry = {
  id: 1,
  kind: "fixed" as const,
  surface: "雨衣",
  reading: "アメイ",
  pronunciation: "アメイ",
  accent_nucleus: 1,
  part_of_speech: "proper_noun" as const,
  enabled: true,
};
const input = { ...entry, id: undefined };
delete input.id;

describe("dictionary routes", () => {
  beforeEach(() => Object.values(mocks).forEach((mock) => mock.mockReset()));

  it("lists, creates, updates, and deletes entries", async () => {
    mocks.listDictionary.mockResolvedValueOnce({ revision: 1, entries: [entry] });
    expect((await dictionaryApp.request("/dictionary")).status).toBe(200);

    mocks.createDictionaryEntry.mockResolvedValueOnce({ revision: 2, entry });
    expect(
      (
        await dictionaryApp.request("/dictionary/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
      ).status,
    ).toBe(201);

    mocks.updateDictionaryEntry.mockResolvedValueOnce({ revision: 3, entry });
    expect(
      (
        await dictionaryApp.request("/dictionary/entries/1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
      ).status,
    ).toBe(200);

    mocks.deleteDictionaryEntry.mockResolvedValueOnce(undefined);
    expect(
      (await dictionaryApp.request("/dictionary/entries/1", { method: "DELETE" })).status,
    ).toBe(204);
  });

  it("returns preview audio", async () => {
    const g2p = createG2pItem("雨衣");
    mocks.previewDictionaryEntry.mockResolvedValueOnce(new Blob(["wav"], { type: "audio/wav" }));
    const response = await dictionaryApp.request("/dictionary/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ g2p }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/wav");
  });
});
