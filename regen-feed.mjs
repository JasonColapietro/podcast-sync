#!/usr/bin/env node
/**
 * Re-render public/feed.xml from the committed feed, using the same buildRSS()
 * template sync.js uses.
 *
 * Why this exists: feed.xml is generated output (sync.js writes it), so a
 * template change must never be applied by hand-editing the XML. But the normal
 * producer — `npm run sync` — cannot be re-run just to restyle the feed: it
 * shells out to yt-dlp against the live channel, re-downloads every episode's
 * mp3 into the git-ignored audio/ cache (statSync(mp3).size is where <enclosure
 * length> comes from), and needs R2 credentials. Running it would also let a
 * changed upstream channel silently rewrite episode content.
 *
 * So this script closes the loop the other way: it parses the committed feed
 * back into the episode records buildRSS() expects and re-emits the document
 * through the real template. Every per-episode value is carried over verbatim,
 * so the only thing that can change is what the template changes.
 *
 * That property is worth checking, not assuming: run this against an unmodified
 * template and the output is byte-identical to the committed feed. `--check`
 * asserts exactly that and writes nothing, so it is safe to run in CI as a
 * drift detector between sync.js and public/feed.xml.
 *
 *   node regen-feed.mjs            # re-render feed.xml through the template
 *   node regen-feed.mjs --check    # fail if template output differs from disk
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { buildRSS } from "./feed-template.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEED = join(__dirname, "public", "feed.xml");

/** Seconds from the "H:MM:SS" / "M:SS" shape formatDuration() emits. */
const durationToSeconds = (text) =>
  String(text)
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);

const cdata = (block, tag) => {
  const m = block.match(
    new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`),
  );
  return m ? m[1] : "";
};
const text = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}(?=[\\s>])[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : "";
};
const attr = (block, tag, name) => {
  const m = block.match(new RegExp(`<${tag}(?=[\\s/>])[^>]*\\s${name}="([^"]*)"`));
  return m ? m[1] : "";
};

/**
 * Rebuild the episode records buildRSS() consumes from the committed feed.
 * Field-for-field inverse of the item template in sync.js.
 */
export function parseEpisodes(xml) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map((block) => ({
    // <guid isPermaLink="false">aisuede-${ep.id}</guid>
    id: text(block, "guid").replace(/^aisuede-/, ""),
    title: cdata(block, "title"),
    description: cdata(block, "description"),
    audioUrl: attr(block, "enclosure", "url"),
    fileSize: attr(block, "enclosure", "length"),
    duration: durationToSeconds(text(block, "itunes:duration")),
    // <pubDate> is written as new Date(timestamp * 1000).toUTCString()
    timestamp: Date.parse(text(block, "pubDate")) / 1000,
    thumbnail: attr(block, "itunes:image", "href"),
  }));
}

const main = () => {
  const check = process.argv.includes("--check");
  const current = readFileSync(FEED, "utf8");
  const episodes = parseEpisodes(current);

  if (!episodes.length) {
    console.error("regen-feed: no <item> entries parsed — refusing to write an empty feed");
    process.exit(1);
  }

  // The template returns no trailing newline; the committed file has one.
  const rendered = `${buildRSS(episodes)}\n`;

  if (check) {
    if (rendered !== current) {
      console.error(
        "regen-feed: public/feed.xml does not match sync.js's template.\n" +
          "The feed was hand-edited, or the template changed without a re-render.\n" +
          "Run: node regen-feed.mjs",
      );
      process.exit(1);
    }
    console.log(`regen-feed: feed.xml matches the template (${episodes.length} episodes)`);
    return;
  }

  writeFileSync(FEED, rendered);
  console.log(`regen-feed: re-rendered public/feed.xml (${episodes.length} episodes)`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
