import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { parseEpisodes } from "../build-episodes.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const episodesDir = join(root, "public", "episodes");
const feed = readFileSync(join(root, "public", "feed.xml"), "utf8");
const episodes = parseEpisodes(feed);
const pages = readdirSync(episodesDir)
  .filter((name) => name.endsWith(".html"))
  .sort();

const FAVICON_LINKS = [
  'rel="icon" href="/favicon.ico" sizes="any"',
  'rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"',
  'rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"',
  'rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"',
];

const metaContent = (html, attribute, value) => {
  const pattern = new RegExp(
    `<meta\\s+${attribute}="${value}"\\s+content="([^"]*)"\\s*/?>`,
  );
  return html.match(pattern)?.[1] ?? "";
};

test("generated episode pages match the feed episode set", () => {
  assert.ok(episodes.length > 0, "expected at least one episode in the feed");
  assert.equal(pages.length, episodes.length, "expected one generated page per feed episode");
});

test("the podcast root advertises the Suede favicon set", () => {
  const html = readFileSync(join(root, "public", "index.html"), "utf8");
  for (const link of FAVICON_LINKS) assert.ok(html.includes(link), `missing ${link}`);
});

for (const page of pages) {
  test(`${page}: Twitter metadata mirrors the Open Graph card`, () => {
    const html = readFileSync(join(episodesDir, page), "utf8");
    const ogTitle = metaContent(html, "property", "og:title");
    const ogDescription = metaContent(html, "property", "og:description");
    const ogImage = metaContent(html, "property", "og:image");

    assert.ok(ogTitle, `${page}: missing og:title`);
    assert.ok(ogDescription, `${page}: missing og:description`);
    // Link previews use the 1200x630 card; the square show art stays in the feed.
    assert.equal(ogImage, "https://podcast.suedeai.ai/og-image.jpg");
    assert.equal(metaContent(html, "property", "og:image:width"), "1200");
    assert.equal(metaContent(html, "property", "og:image:height"), "630");
    assert.equal(metaContent(html, "name", "twitter:title"), ogTitle);
    assert.equal(metaContent(html, "name", "twitter:description"), ogDescription);
    assert.equal(metaContent(html, "name", "twitter:image"), ogImage);
    for (const link of FAVICON_LINKS) assert.ok(html.includes(link), `${page}: missing ${link}`);
  });
}
