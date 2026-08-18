import { describe, expect, it } from "vitest";
import {
  decodeProjectPathSegment,
  encodeProjectPathSegment,
  getProjectPageHref,
  getProjectPathFromRoute,
  getProjectRootHref,
  getProjectSettingsDialogHref,
  getProjectSettingsHref,
  getSchedulesHref,
  isProjectSettingsRoute,
  isSchedulesRoute,
  parseProjectRoute,
  resolvePageFallbackHref,
  resolveProjectLandingHref,
  resolveProjectRouteRedirect,
} from "@/app/features/project/lib/project-route";

describe("project route parser", () => {
  it("round-trips nested project paths as a single encoded segment", () => {
    const projectPath = "nested/example project";
    const encoded = encodeProjectPathSegment(projectPath);

    expect(encoded).toBe("nested%2Fexample%20project");
    expect(encoded.includes("/")).toBe(false);
    expect(decodeProjectPathSegment(encoded)).toBe(projectPath);
    expect(getProjectRootHref(projectPath)).toBe("/projects/nested%2Fexample%20project");
  });

  it("parses project, page, and settings routes", () => {
    expect(parseProjectRoute("/projects/nested%2Fexample")).toEqual({
      type: "project",
      projectPath: "nested/example",
    });
    expect(parseProjectRoute("/projects/nested%2Fexample/pages/page-1")).toEqual({
      type: "page",
      projectPath: "nested/example",
      pageId: "page-1",
    });
    expect(parseProjectRoute("/projects/nested%2Fexample/settings")).toEqual({
      type: "settings",
      projectPath: "nested/example",
    });
    expect(parseProjectRoute("/schedules")).toEqual({ type: "schedules" });
    expect(parseProjectRoute("/schedules/")).toEqual({ type: "schedules" });
    expect(getSchedulesHref()).toBe("/schedules");
    expect(isSchedulesRoute(parseProjectRoute("/schedules"))).toBe(true);
    expect(getProjectPathFromRoute(parseProjectRoute("/schedules"))).toBeNull();
    expect(getProjectPageHref("nested/example", "page 1")).toBe(
      "/projects/nested%2Fexample/pages/page%201",
    );
    expect(getProjectSettingsHref("nested/example")).toBe("/projects/nested%2Fexample/settings");
  });

  it("opens settings through the settings route and returns to a page on close", () => {
    const projectPath = "nested/example";
    const sequenceOrder = ["page-a", "page-b"];

    expect(isProjectSettingsRoute(parseProjectRoute(getProjectSettingsHref(projectPath)))).toBe(
      true,
    );
    expect(getProjectSettingsDialogHref(projectPath, true, sequenceOrder)).toBe(
      getProjectSettingsHref(projectPath),
    );
    expect(getProjectSettingsDialogHref(projectPath, false, sequenceOrder)).toBe(
      getProjectPageHref(projectPath, "page-a"),
    );
  });

  it("rejects unknown paths", () => {
    expect(parseProjectRoute("/")).toEqual({ type: "unknown" });
    expect(parseProjectRoute("/nested/example")).toEqual({ type: "unknown" });
    expect(parseProjectRoute("/projects/")).toEqual({ type: "unknown" });
    expect(parseProjectRoute("/projects/nested%2Fexample/pages")).toEqual({ type: "unknown" });
    expect(parseProjectRoute("/projects/nested%2Fexample/pages/")).toEqual({ type: "unknown" });
    expect(parseProjectRoute("/projects/nested%2Fexample/extra")).toEqual({ type: "unknown" });
  });

  it("returns unknown for malformed percent encoding instead of throwing", () => {
    expect(parseProjectRoute("/projects/%E0%A4%A")).toEqual({ type: "unknown" });
    expect(parseProjectRoute("/projects/ok/pages/%E0%A4%A")).toEqual({ type: "unknown" });
    expect(() => parseProjectRoute("/projects/%ZZ")).not.toThrow();
    expect(parseProjectRoute("/projects/%ZZ")).toEqual({ type: "unknown" });
  });

  it("does not fall back a valid non-first page URL while project data is loading", () => {
    const route = {
      type: "page" as const,
      projectPath: "nested/example",
      pageId: "page-b",
    };

    expect(
      resolveProjectRouteRedirect({
        route,
        sequenceOrder: [],
        hasProjectData: false,
      }),
    ).toEqual({ action: "none" });

    expect(
      resolveProjectRouteRedirect({
        route: { type: "schedules" },
        sequenceOrder: ["page-a"],
        hasProjectData: true,
      }),
    ).toEqual({ action: "none" });

    expect(
      resolveProjectRouteRedirect({
        route,
        sequenceOrder: ["page-a", "page-b"],
        hasProjectData: true,
      }),
    ).toEqual({ action: "remember", pageId: "page-b" });
  });

  it("falls back to the last or first page when a page id is missing", () => {
    const projectPath = "nested/example";
    const sequenceOrder = ["page-a", "page-b"];

    expect(resolveProjectLandingHref(projectPath, sequenceOrder, "page-b")).toBe(
      getProjectPageHref(projectPath, "page-b"),
    );
    expect(resolveProjectLandingHref(projectPath, sequenceOrder, "missing")).toBe(
      getProjectPageHref(projectPath, "page-a"),
    );
    expect(resolveProjectLandingHref(projectPath, [], null)).toBe(getProjectRootHref(projectPath));
    expect(resolvePageFallbackHref(projectPath, sequenceOrder, "page-a")).toBe(
      getProjectPageHref(projectPath, "page-a"),
    );
    expect(resolvePageFallbackHref(projectPath, sequenceOrder, "missing", "page-b")).toBe(
      getProjectPageHref(projectPath, "page-b"),
    );
  });
});
