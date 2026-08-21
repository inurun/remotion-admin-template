import { describe, expect, it } from "vitest";
import { formatProjectTitleForUi } from "../project-title";

describe("formatProjectTitleForUi", () => {
  it("replaces newlines with spaces", () => {
    expect(formatProjectTitleForUi("Sample\nProject")).toBe("Sample Project");
    expect(formatProjectTitleForUi("a\r\nb")).toBe("a b");
  });

  it("replaces typed \\n sequences with spaces", () => {
    expect(formatProjectTitleForUi("Sample\\nProject")).toBe("Sample Project");
  });
});
