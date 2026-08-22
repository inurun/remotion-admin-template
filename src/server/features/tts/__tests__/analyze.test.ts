import { describe, expect, it, vi } from "vitest";

const { analyzeTextMock } = vi.hoisted(() => ({
  analyzeTextMock: vi.fn(),
}));

vi.mock("@/server/features/haqumei-api/analyze", () => ({
  analyzeText: analyzeTextMock,
}));

import { analyzeTts } from "../use-case";

describe("analyzeTts", () => {
  it("forwards the request text without extra trim", async () => {
    analyzeTextMock.mockResolvedValueOnce({ text: "  人気  ", kana: "ニンキ'", warnings: [] });

    await analyzeTts({}, { text: "  人気  " });

    expect(analyzeTextMock).toHaveBeenCalledWith({}, "  人気  ");
  });
});
