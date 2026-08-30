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

const text = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const words = (value) => text(value).split(/\s+/).filter(Boolean).length;

test("the generated cohort has one page for every feed episode", () => {
  assert.equal(episodes.length, 33);
  assert.equal(pages.length, episodes.length);
});

for (const episode of episodes) {
  test(`${episode.slug}: show notes use truthful, bounded H2 sections`, () => {
    const html = readFileSync(join(episodesDir, `${episode.slug}.html`), "utf8");
    const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    const h2s = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((match) => text(match[1]));
    const noteBlocks = [...html.matchAll(/<div class="notes">([\s\S]*?)<\/div>/gi)].map((match) => match[1]);

    assert.equal(h1s.length, 1, "expected one episode title H1");
    assert.deepEqual(
      h2s,
      episode.body.includes("⏱️ Chapters")
        ? ["Episode show notes", "Episode chapters"]
        : ["Episode show notes"],
    );
    assert.ok(noteBlocks.length > 0, "expected show-note content beneath an H2");
    assert.equal(
      noteBlocks.map(text).join(" "),
      episode.body.replace(/\s+/g, " ").trim(),
      "heading markup must preserve every existing show-note word in order",
    );
    for (const block of noteBlocks) {
      assert.ok(words(block) <= 375, `show-note section has ${words(block)} words`);
    }
  });
}
