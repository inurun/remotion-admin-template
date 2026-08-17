import { describe, expect, it } from "vitest";
import { getProjectFileStem, getProjectOutputVideoFileName } from "../project-path";

describe("project path", () => {
  it("uses the data file stem as the output video name", () => {
    expect(getProjectFileStem("example")).toBe("example");
    expect(getProjectFileStem("nested/example")).toBe("example");
    expect(getProjectOutputVideoFileName("nested/example")).toBe("example.mp4");
  });
});
