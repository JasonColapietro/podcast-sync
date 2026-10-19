import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const pub = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const html = readFileSync(join(pub, "404.html"), "utf8");
const sitemap = readFileSync(join(pub, "sitemap.xml"), "utf8");

// Vercel serves public/404.html with a 404 status for any unknown path. Without
// it the platform default page answered, with no noindex and no way back in.
test("the 404 page is noindex, carries no canonical and routes back into the show", () => {
  assert.match(html, /<meta name="robots" content="noindex, follow"/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  for (const href of ['href="/"', 'href="/appearances"', 'href="/contact"', 'href="https://suedeai.ai/privacy"']) {
    assert.ok(html.includes(href), `404 page links ${href}`);
  }
  assert.doesNotMatch(sitemap, /404/);
});
