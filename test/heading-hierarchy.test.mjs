import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { episodeContent, parseEpisodes } from "../build-episodes.mjs";
import { productsFor } from "../topics.mjs";

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

// List glyphs in the feed copy become list markers on the page, so the word
// comparison below ignores them on both sides.
const GLYPHS = /(^|\s)[•✅▪‣](?=\s)/gu;
const comparable = (value) => value.replace(GLYPHS, " ").replace(/\s+/g, " ").trim();

test("the generated cohort has one page for every feed episode", () => {
  assert.equal(episodes.length, 33);
  assert.equal(pages.length, episodes.length);
});

for (const episode of episodes) {
  test(`${episode.slug}: show notes use truthful, bounded H2 sections`, () => {
    const html = readFileSync(join(episodesDir, `${episode.slug}.html`), "utf8");
    const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    const h2s = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((match) => text(match[1]));
    const { chapters } = episodeContent(episode);

    assert.equal(h1s.length, 1, "expected one episode title H1");
    assert.deepEqual(h2s, [
      "Episode show notes",
      ...(chapters ? ["Episode chapters"] : []),
      ...(productsFor(episode).length ? ["Suede AI products in this episode"] : []),
      "Related episodes",
    ]);

    // Every word of the feed copy is on the page once, in order: the notes,
    // then (for the one description that carries its own chapter block) the
    // chapter list and whatever followed it. The "⏱️ Chapters" line itself is
    // replaced by the "Episode chapters" heading.
    const feedCopy = [
      ...html.matchAll(/<div class="notes">([\s\S]*?)<\/div>|<ol class="chapters">([\s\S]*?)<\/ol>/gi),
    ];
    const notesOnly = feedCopy.filter((m) => m[1] !== undefined).map((m) => m[1]);
    const chapterList = feedCopy.filter((m) => m[2] !== undefined).map((m) => text(m[2]));
    assert.ok(notesOnly.length > 0, "expected show-note content beneath an H2");

    const inlineChapters = episode.body.includes("⏱️ Chapters");
    const rendered = inlineChapters
      ? feedCopy.map((m) => text(m[1] ?? m[2])).join(" ")
      : notesOnly.map(text).join(" ");
    assert.equal(
      comparable(rendered),
      comparable(episode.body.replace("⏱️ Chapters", " ")),
      "heading markup must preserve every existing show-note word in order",
    );
    for (const block of notesOnly) {
      assert.ok(words(block) <= 375, `show-note section has ${words(block)} words`);
    }

    // chapters.json markers render as their own list, labelled as YouTube's.
    if (chapters && !inlineChapters) {
      assert.equal(
        chapterList.join(" "),
        chapters.items.map((c) => `${c.stamp} ${c.title}`).join(" "),
      );
      assert.ok(html.includes("YouTube generated these chapter markers"), "chapter source is not stated");
    }
    if (!chapters) assert.equal(chapterList.length, 0, "no chapter data, so no chapter list");
  });
}
