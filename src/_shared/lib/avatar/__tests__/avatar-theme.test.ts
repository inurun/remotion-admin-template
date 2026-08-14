import { describe, expect, it } from "vitest";
import { avatarOptions, type AvatarType } from "@/_schemas";
import { getAvatarTheme } from "@/_shared/lib/avatar/avatar-theme";

const avatarTypes = Object.keys(avatarOptions) as AvatarType[];

describe("avatar theme", () => {
  it("defines displayName and color for every avatar type", () => {
    for (const type of avatarTypes) {
      const theme = getAvatarTheme(type);
      expect(theme.displayName.length).toBeGreaterThan(0);
      expect(theme.color).toBe(`var(--color-${type})`);
    }
  });

  it("returns demo theme", () => {
    expect(getAvatarTheme("demo")).toEqual({
      displayName: "Demo",
      color: "var(--color-demo)",
    });
  });
});
