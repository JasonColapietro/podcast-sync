import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { parseEpisodes } from "../build-episodes.mjs";
import { BRAND_TERMS, PAGE_KEYWORDS, episodeKeywords, keywordContent, withBrand } from "../keywords.mjs";

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

test("every indexable page carries a non-empty keywords meta with the brand terms", () => {
  const files = [...Object.values(STATIC), ...episodeFiles.map((f) => join("episodes", f))];
  const topLevel = readdirSync(pub).filter((f) => f.endsWith(".html"));
  for (const f of topLevel) assert.ok(Object.values(STATIC).includes(f), `unmapped page public/${f}: add it to PAGE_KEYWORDS`);
  for (const rel of files) {
    const html = readFileSync(join(pub, rel), "utf8");
    if (isNoindex(html)) continue;
    const kw = keywordsOf(html);
    assert.ok(kw, `public/${rel} has no <meta name="keywords">`);
    const terms = kw.split(",").map((t) => t.trim().toLowerCase());
    for (const b of BRAND_TERMS) assert.ok(terms.includes(b.toLowerCase()), `public/${rel} missing brand term ${b}`);
    assert.ok(terms.length > BRAND_TERMS.length, `public/${rel} has only brand terms`);
    assert.equal(new Set(terms).size, terms.length, `public/${rel} has duplicate keywords`);
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

test("withBrand dedupes case-insensitively and appends brand terms", () => {
  assert.deepEqual(withBrand(["suede ai", "Music IP", "music ip"]), ["suede ai", "Music IP", ...BRAND_TERMS.slice(1)]);
  assert.ok(!BRAND_TERMS.some((t) => /suede labs ai/i.test(t)), "company name is Suede AI");
});
