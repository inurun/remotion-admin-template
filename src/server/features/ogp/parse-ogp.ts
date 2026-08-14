import createMetascraper from "metascraper";
import metascraperAmazon from "metascraper-amazon";
import metascraperAudio from "metascraper-audio";
import metascraperAuthor from "metascraper-author";
import metascraperBluesky from "metascraper-bluesky";
import metascraperDate from "metascraper-date";
import metascraperDefuddle from "metascraper-defuddle";
import metascraperDescription from "metascraper-description";
import metascraperDribbble from "metascraper-dribbble";
import metascraperFeed from "metascraper-feed";
import metascraperIframe from "metascraper-iframe";
import metascraperImage from "metascraper-image";
import metascraperInstagram from "metascraper-instagram";
import metascraperLang from "metascraper-lang";
import metascraperLogo from "metascraper-logo";
import metascraperPublisher from "metascraper-publisher";
import metascraperReadability from "metascraper-readability";
import metascraperReddit from "metascraper-reddit";
import metascraperSoundcloud from "metascraper-soundcloud";
import metascraperSpotify from "metascraper-spotify";
import metascraperTelegram from "metascraper-telegram";
import metascraperTiktok from "metascraper-tiktok";
import metascraperTitle from "metascraper-title";
import metascraperUol from "metascraper-uol";
import metascraperUrl from "metascraper-url";
import metascraperVideo from "metascraper-video";
import metascraperX from "metascraper-x";
import metascraperYoutube from "metascraper-youtube";
import { ogpMetadataSchema, type OgpMetadata } from "@/_schemas";

const scrapeMetadata = createMetascraper([
  metascraperAmazon(),
  metascraperBluesky(),
  metascraperDribbble(),
  metascraperInstagram(),
  metascraperReddit(),
  metascraperSoundcloud(),
  metascraperSpotify(),
  metascraperTelegram(),
  metascraperTiktok(),
  metascraperUol(),
  metascraperX(),
  metascraperYoutube(),
  metascraperAudio(),
  metascraperAuthor(),
  metascraperDate(),
  metascraperDescription(),
  metascraperFeed(),
  metascraperIframe(),
  metascraperImage(),
  metascraperLang(),
  metascraperLogo(),
  metascraperPublisher(),
  metascraperTitle(),
  metascraperUrl(),
  metascraperVideo(),
  metascraperReadability(),
  metascraperDefuddle(),
]);

function text(value: string | undefined) {
  return value ?? "";
}

function urlOrNull(value: string | undefined) {
  return value || null;
}

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1];
}

function iconRelScore(rel: string) {
  const normalized = rel.toLowerCase();
  if (/\bapple-touch-icon/.test(normalized)) {
    return 2;
  }
  if (/\bicon\b/.test(normalized)) {
    return 1;
  }
  return 0;
}

function resolveAbsoluteUrl(href: string, pageUrl: string) {
  try {
    return new URL(href, pageUrl).toString();
  } catch {
    return null;
  }
}

export function resolveFaviconUrl(html: string, pageUrl: string) {
  let bestHref: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = attr(tag, "rel");
    const href = attr(tag, "href");
    if (!rel || !href) {
      continue;
    }
    const score = iconRelScore(rel);
    if (score === 0 || score >= bestScore) {
      continue;
    }
    const absolute = resolveAbsoluteUrl(href, pageUrl);
    if (!absolute) {
      continue;
    }
    bestHref = absolute;
    bestScore = score;
  }

  return bestHref ?? resolveAbsoluteUrl("/favicon.ico", pageUrl);
}

export async function parseOgpFromHtml(html: string, pageUrl: string): Promise<OgpMetadata> {
  const metadata = await scrapeMetadata({ html, url: pageUrl });

  return ogpMetadataSchema.parse({
    url: metadata.url || pageUrl,
    title: text(metadata.title),
    description: text(metadata.description),
    image: urlOrNull(metadata.image),
    logo: urlOrNull(metadata.logo),
    favicon: resolveFaviconUrl(html, pageUrl),
    author: text(metadata.author),
    date: text(metadata.date),
    publisher: text(metadata.publisher),
    lang: text(metadata.lang),
    audio: urlOrNull(metadata.audio),
    video: urlOrNull(metadata.video),
    iframe: text(metadata.iframe),
    feed: text(metadata.feed),
  });
}

export function assertHttpUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported");
  }

  return url.toString();
}
