import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { parseEpisodes } from "../build-episodes.mjs";
import { BRAND_TERM, MAX_TERMS, PAGE_KEYWORDS, episodeKeywords, isBrandTerm, keywordContent, withBrand } from "../keywords.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = join(__dirname, "..", "public");

const unesc = (s) =>
  s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const keywordsOf = (html) => {
  const m = html.match(/<meta\s+name="keywords"\s+content="([^"]*)"\s*\/?>/);
  return m ? unesc(m[1]) : null;
};
const isNoindex = (html) => /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);

// Every indexable HTML page on the site, keyed by its public path.
const STATIC = { "/": "index.html", "/about": "about.html", "/contact": "contact.html", "/appearances": "appearances/index.html" };
const episodeFiles = readdirSync(join(pub, "episodes")).filter((f) => f.endsWith(".html"));

test("every indexable page carries a short keywords meta with exactly one brand term", () => {
  const files = [...Object.values(STATIC), ...episodeFiles.map((f) => join("episodes", f))];
  const topLevel = readdirSync(pub).filter((f) => f.endsWith(".html"));
  for (const f of topLevel) assert.ok(Object.values(STATIC).includes(f), `unmapped page public/${f}: add it to PAGE_KEYWORDS`);
  for (const rel of files) {
    const html = readFileSync(join(pub, rel), "utf8");
    if (isNoindex(html)) continue;
    const kw = keywordsOf(html);
    assert.ok(kw, `public/${rel} has no <meta name="keywords">`);
    const terms = kw.split(",").map((t) => t.trim());
    assert.ok(terms.length <= MAX_TERMS, `public/${rel} has ${terms.length} keywords (max ${MAX_TERMS})`);
    assert.equal(terms.filter(isBrandTerm).length, 1, `public/${rel} must carry exactly one brand term`);
    assert.ok(terms.length > 1, `public/${rel} has only a brand term`);
    const lower = terms.map((t) => t.toLowerCase());
    assert.equal(new Set(lower).size, lower.length, `public/${rel} has duplicate keywords`);
    for (const t of terms) assert.doesNotMatch(t, /suede labs/i, `public/${rel} uses the retired name: ${t}`);
  }
});

test("static pages match the central keyword map", () => {
  for (const [path, file] of Object.entries(STATIC)) {
    const html = readFileSync(join(pub, file), "utf8");
    assert.equal(keywordsOf(html), keywordContent(PAGE_KEYWORDS[path]), `${path} drifted from keywords.mjs`);
  }
});

test("episode pages match episodeKeywords for their feed entry", () => {
  const episodes = parseEpisodes(readFileSync(join(pub, "feed.xml"), "utf8"));
  for (const e of episodes) {
    const html = readFileSync(join(pub, "episodes", `${e.slug}.html`), "utf8");
    assert.equal(keywordsOf(html), episodeKeywords(e).join(", "), `${e.slug} drifted from keywords.mjs`);
  }
});

test("withBrand dedupes, keeps one brand term and caps the list", () => {
  assert.deepEqual(withBrand(["Music IP", "music ip"]), ["Music IP", BRAND_TERM]);
  assert.deepEqual(withBrand(["contact AI Suede Podcast", "booking", "Suede AI", "Jason Colapietro"]), [
    "contact AI Suede Podcast",
    "booking",
  ]);
  const many = withBrand(Array.from({ length: 15 }, (_, i) => `term ${i}`));
  assert.equal(many.length, MAX_TERMS);
  assert.equal(many.at(-1), BRAND_TERM);
  assert.equal(many[0], "term 0");
  assert.ok(!/suede labs ai/i.test(BRAND_TERM), "company name is Suede AI");
});
