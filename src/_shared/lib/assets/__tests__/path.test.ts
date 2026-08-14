import { describe, expect, it } from "vitest";

import type { AssetFile } from "../path";
import { assetPath } from "../path";

describe("assetPath", () => {
  it("returns the slash-prefixed asset path", () => {
    expect(assetPath("favicon.svg" as AssetFile)).toBe("/favicon.svg");
  });

  it("preserves nested asset paths", () => {
    expect(assetPath("images/demo.png" as AssetFile)).toBe("/images/demo.png");
  });
});
