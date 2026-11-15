import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { NOTES, NOTES_DATE, NOTES_INDEX, SATELLITE_ARTICLES, notePath, notePublished } from "../notes.mjs";

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
    assert.equal(post.datePublished, notePublished(n));
    assert.equal(post.url, `${SITE}${notePath(n.slug)}`);
    const page = graphOf(html).find((node) => node["@type"] === "WebPage");
    assert.equal(page.breadcrumb["@type"], "BreadcrumbList");
  });
}

// Notes published after the first set (the 2026-11-15 depth round) must each
// cite real articles on other Suede AI satellites, carry the Clutch ranking in
// its exact wording once and apart from The Manifest result, and show their own
// publish date everywhere it appears.
const CLUTCH_TEXT =
  "Suede AI ranks among Clutch's Top 30 AI Consultants in Florida and Top 50 AI Consultants nationwide (November 2026).";
const SATELLITE_HOSTS = /^https:\/\/(signal|docs|optimize|agentix|scan|dna|cosmos|fretpulse)\.suedeai\.ai\/|^https:\/\/(guitar\.services|guitarchords\.info|guitarhub\.org)\//;
const depthNotes = NOTES.filter((n) => notePublished(n) !== NOTES_DATE);

test("the depth round added its two notes", () => {
  assert.deepEqual(
    depthNotes.map((n) => n.slug),
    ["chapters-transcripts-show-notes-checklist", "repurpose-one-episode-five-search-assets"],
  );
  for (const url of Object.values(SATELLITE_ARTICLES)) assert.match(url, SATELLITE_HOSTS);
});

for (const n of depthNotes) {
  test(`${n.slug}: cites two satellite articles, states Clutch once, and dates itself`, () => {
    const html = read(join("notes", `${n.slug}.html`));
    const articleHtml = html.match(/<article\b[\s\S]*?<\/article>/)[0];
    // Tags dropped without a space, so "<a>Clutch</a>'s" reads as "Clutch's".
    const article = articleHtml.replace(/<[^>]+>/g, "").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();
    assert.equal(notePublished(n), "2026-11-15");

    const deepLinks = new Set(
      [...articleHtml.matchAll(/href="([^"]+)"/g)]
        .map((m) => m[1])
        .filter((h) => SATELLITE_HOSTS.test(h) && /\/(notes|articles)\/[a-z0-9-]+$/.test(h)),
    );
    assert.ok(deepLinks.size >= 2, `only ${deepLinks.size} deep links to satellite articles`);
    for (const h of deepLinks) assert.ok(Object.values(SATELLITE_ARTICLES).includes(h), `${h} is not a vetted satellite article`);
    assert.ok(articleHtml.includes('href="https://suedeai.ai/founder"'), "no in-body founder link");
    assert.ok(/href="https:\/\/suedeai\.agency\//.test(articleHtml), "no in-body suedeai.agency link");

    assert.equal(article.split(CLUTCH_TEXT).length - 1, 1, "Clutch claim must appear once, verbatim");
    const clutchSentence = article.slice(article.indexOf(CLUTCH_TEXT), article.indexOf(CLUTCH_TEXT) + CLUTCH_TEXT.length);
    assert.doesNotMatch(clutchSentence, /manifest/i);
    assert.match(article, /October 31, 2026, The Manifest ranked Suede AI SEO first among Palm Beach County-based companies/);

    assert.ok((article.match(/Jason Colapietro/g) || []).length >= 5, "Jason Colapietro named fewer than 5 times");
    assert.ok((article.match(/Suede Labs/g) || []).length <= 1, "Suede Labs used more than once");

    const graph = graphOf(html);
    assert.equal(graph.find((node) => node["@type"] === "BlogPosting").datePublished, "2026-11-15");
    assert.ok(html.includes('<meta property="article:published_time" content="2026-11-15" />'));
    assert.ok(read("notes/index.html").includes(`<time datetime="2026-11-15">`), "index shows the wrong date");
    for (const place of n.places ?? []) {
      assert.ok(
        graph.find((node) => node["@type"] === "BlogPosting").spatialCoverage.some((p) => p.name === place.name),
        `${place.name} missing from spatialCoverage`,
      );
    }
  });
}

test("the sitemap marks every note as modified on 2026-11-15", () => {
  const sitemap = read("sitemap.xml");
  for (const n of NOTES) {
    const entry = sitemap.match(new RegExp(`<loc>${SITE}${notePath(n.slug)}</loc>\\s*<lastmod>([^<]+)</lastmod>`));
    assert.ok(entry, `${n.slug} missing a lastmod`);
    assert.equal(entry[1], "2026-11-15");
  }
});
