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

for (const page of pages) {
  test(`${page}: Twitter metadata mirrors the Open Graph card`, () => {
    const html = readFileSync(join(episodesDir, page), "utf8");
    const ogTitle = metaContent(html, "property", "og:title");
    const ogDescription = metaContent(html, "property", "og:description");
    const ogImage = metaContent(html, "property", "og:image");

    assert.ok(ogTitle, `${page}: missing og:title`);
    assert.ok(ogDescription, `${page}: missing og:description`);
    assert.equal(ogImage, "https://podcast.suedeai.ai/artwork.jpg");
    assert.equal(metaContent(html, "name", "twitter:title"), ogTitle);
    assert.equal(metaContent(html, "name", "twitter:description"), ogDescription);
    assert.equal(metaContent(html, "name", "twitter:image"), ogImage);
  });
}
