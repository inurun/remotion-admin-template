import { describe, expect, it } from "vitest";
import { TiptapImage } from "../tiptap-image";

describe("TiptapImage", () => {
  it("does not parse data URL images", () => {
    const rules = TiptapImage.config.parseHTML?.call({} as never);

    expect(rules).toEqual([{ tag: 'img[src]:not([src^="data:"])' }]);
  });
});
