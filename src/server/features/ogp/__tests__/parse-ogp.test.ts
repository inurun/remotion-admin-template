import { describe, expect, it } from "vitest";
import { assertHttpUrl, parseOgpFromHtml, resolveFaviconUrl } from "../parse-ogp";

const emptyOgp = {
  logo: null,
  favicon: "https://example.com/favicon.ico",
  author: "",
  date: "",
  publisher: "",
  lang: "",
  audio: null,
  video: null,
  iframe: "",
  feed: "",
};

describe("parseOgpFromHtml", () => {
  it("reads og meta tags via metascraper", async () => {
    const html = `
      <html lang="ja">
        <head>
          <meta property="og:title" content="OG Title" />
          <meta property="og:description" content="OG Description" />
          <meta property="og:image" content="https://example.com/image.png" />
          <meta property="og:logo" content="https://example.com/logo.png" />
          <meta property="og:video" content="https://example.com/video.mp4" />
          <meta property="og:audio" content="https://example.com/audio.mp3" />
          <meta name="author" content="Ada Lovelace" />
          <meta property="article:published_time" content="2024-01-02T00:00:00.000Z" />
          <meta property="og:site_name" content="Example Pub" />
          <link rel="alternate" type="application/rss+xml" href="https://example.com/feed.xml" />
          <link rel="icon" href="/icon.png" />
          <title>Document</title>
        </head>
      </html>
    `;

    await expect(parseOgpFromHtml(html, "https://example.com/page")).resolves.toEqual({
      url: "https://example.com/page",
      title: "OG Title",
      description: "OG Description",
      image: "https://example.com/image.png",
      logo: "https://example.com/logo.png",
      favicon: "https://example.com/icon.png",
      author: "Ada Lovelace",
      date: "2024-01-02T00:00:00.000Z",
      publisher: "Example Pub",
      lang: "ja",
      audio: "https://example.com/audio.mp3",
      video: "https://example.com/video.mp4",
      iframe: "",
      feed: "https://example.com/feed.xml",
    });
  });

  it("keeps image and logo separate when only logo exists", async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="OG Title" />
          <meta property="og:description" content="OG Description" />
          <meta property="og:logo" content="https://example.com/logo.png" />
          <title>Document</title>
        </head>
      </html>
    `;

    await expect(parseOgpFromHtml(html, "https://example.com/page")).resolves.toEqual({
      ...emptyOgp,
      url: "https://example.com/page",
      title: "OG Title",
      description: "OG Description",
      image: null,
      logo: "https://example.com/logo.png",
    });
  });

  it("keeps image null when neither image nor logo exists", async () => {
    const html = `<html><head><title>Fallback Title</title></head></html>`;

    await expect(parseOgpFromHtml(html, "https://example.com")).resolves.toEqual({
      ...emptyOgp,
      url: "https://example.com",
      title: "Fallback Title",
      description: "",
      image: null,
    });
  });
});

describe("resolveFaviconUrl", () => {
  it("prefers rel=icon over apple-touch-icon", () => {
    const html = `
      <link rel="apple-touch-icon" href="/apple.png" />
      <link rel="icon" href="/favicon-32.png" />
    `;
    expect(resolveFaviconUrl(html, "https://example.com/page")).toBe(
      "https://example.com/favicon-32.png",
    );
  });

  it("falls back to /favicon.ico", () => {
    expect(resolveFaviconUrl("<html></html>", "https://example.com/page")).toBe(
      "https://example.com/favicon.ico",
    );
  });
});

describe("assertHttpUrl", () => {
  it("accepts http(s) urls", () => {
    expect(assertHttpUrl("https://example.com/a")).toBe("https://example.com/a");
  });

  it("rejects non-http urls", () => {
    expect(() => assertHttpUrl("file:///tmp/x")).toThrow("Only http(s) URLs are supported");
  });
});
