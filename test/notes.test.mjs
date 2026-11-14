import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { NOTES, NOTES_DATE, NOTES_INDEX, notePath } from "../notes.mjs";

const pub = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const SITE = "https://podcast.suedeai.ai";
const read = (rel) => readFileSync(join(pub, rel), "utf8");
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const graphOf = (html) =>
  JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];

// Claims the estate has ruled out. A note that ships one of these is wrong.
const FORBIDDEN = [/velvet sundown/i, /forbes/i, /\bAnthropic partner\b/i, /\bClaude partner\b/i, /\bGoogle partner\b/i, /multimillion/i, /\$\s?(28|30)\s?M\b/i];

test("every note is a page, and every page under /notes is a note or the index", () => {
  const files = readdirSync(join(pub, "notes")).sort();
  assert.deepEqual(files, ["index.html", ...NOTES.map((n) => `${n.slug}.html`)].sort());
  const sitemap = read("sitemap.xml");
  for (const n of NOTES) {
    assert.ok(sitemap.includes(`<loc>${SITE}${notePath(n.slug)}</loc>`), `${n.slug} missing from sitemap`);
    assert.ok(read("notes/index.html").includes(`href="${notePath(n.slug)}"`), `${n.slug} not linked from /notes`);
    assert.ok(read("index.html").includes(`href="${notePath(n.slug)}"`), `${n.slug} not linked from home`);
    assert.ok(read("llms.txt").includes(`${SITE}${notePath(n.slug)}`), `${n.slug} missing from llms.txt`);
    assert.ok(read("llms-full.txt").includes(`${SITE}${notePath(n.slug)}`), `${n.slug} missing from llms-full.txt`);
  }
});

test("note titles and descriptions fit search result limits", () => {
  for (const p of [NOTES_INDEX, ...NOTES]) {
    assert.ok(p.title.length >= 50 && p.title.length <= 60, `title is ${p.title.length} chars: ${p.title}`);
    assert.ok(
      p.description.length >= 120 && p.description.length <= 160,
      `description is ${p.description.length} chars: ${p.description}`,
    );
  }
});

for (const n of NOTES) {
  test(`${n.slug}: a substantial, attributed BlogPosting that cites no ruled-out claim`, () => {
    const html = read(join("notes", `${n.slug}.html`));
    const article = text(html.match(/<article\b[\s\S]*?<\/article>/)[0]);
    const words = article.split(" ").length;
    assert.ok(words >= 800 && words <= 1400, `${words} words`);
    for (const re of FORBIDDEN) assert.doesNotMatch(article, re);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes('href="https://suedeai.ai/founder"'), "no founder link");
    assert.ok(html.includes('href="https://jasoncolapietro.com/"'), "no author site link");
    assert.ok(/href="https:\/\/suedeai\.agency\/(assessment)?"/.test(html), "no next step to suedeai.agency");

    const post = graphOf(html).find((node) => node["@type"] === "BlogPosting");
    assert.ok(post, "expected a BlogPosting");
    assert.deepEqual(post.author, { "@id": "https://suedeai.ai/founder#person" });
    assert.deepEqual(post.publisher, { "@id": "https://suedeai.ai/#organization" });
    assert.equal(post.datePublished, NOTES_DATE);
    assert.equal(post.url, `${SITE}${notePath(n.slug)}`);
    const page = graphOf(html).find((node) => node["@type"] === "WebPage");
    assert.equal(page.breadcrumb["@type"], "BreadcrumbList");
  });
}
