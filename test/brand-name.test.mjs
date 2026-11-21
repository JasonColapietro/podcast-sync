// The company is "Suede" (owner direction, 2026-11-21). "Suede AI" and
// "Suede Labs" appear in Suede's own copy on this site only as the
// Organization's schema `alternateName`, the one alias line per discovery file,
// and the verbatim or historical text listed below. Episode titles and show
// notes are the published episode record and stay as published, so the pages
// built from them (episodes/, topics/, appearances/, llms-full.txt and the feed's
// items) are not scanned, and episode titles are lifted out of the pages that
// list them.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const pub = join(root, "public");
const ALIAS_LINE = "Suede was formerly known as Suede AI and Suede Labs.";
const ALLOWED = [
  // Business Insider headline, quoted verbatim.
  "Opens Suede Labs AI's",
  // The Manifest's listing name.
  "Suede AI SEO first",
  // A search query as typed.
  "Suede labs ai review",
  // Historical statements about the earlier names.
  "changed from Suede Labs to Suede AI",
  "The Suede Labs name still turns up",
];

const feed = readFileSync(join(pub, "feed.xml"), "utf8");
const channel = feed.split("<item>")[0];
const titles = [...feed.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].map((m) => m[1]);
const variants = (t) => [t, t.replace(/&/g, "&amp;"), t.replace(/&/g, "&amp;").replace(/'/g, "&#39;"), t.replace(/'/g, "’")];

const files = [
  ...["index.html", "about.html", "contact.html", "404.html", "ai-instructions.html", "llms.txt"],
  ...readdirSync(join(pub, "notes")).map((f) => `notes/${f}`),
];

test("Suede's own copy calls the company Suede, never Suede AI or Suede Labs", () => {
  const hits = [];
  const check = (name, source) => {
    assert.ok(source.split(ALIAS_LINE).length <= 2, `${name} repeats the alias line`);
    let text = source.replace(/"alternateName":\s*\[[^\]]*\]/g, (m) => m.replace(/[^\n]/g, " "));
    for (const literal of [ALIAS_LINE, ...ALLOWED, ...titles.flatMap(variants)]) {
      text = text.split(literal).join(" ".repeat(literal.length));
    }
    text.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(/\bsuede (?:ai|labs)\b/gi)) hits.push(`${name}:${i + 1}: ${m[0]}`);
    });
  };
  for (const file of files) check(`public/${file}`, readFileSync(join(pub, file), "utf8"));
  check("public/feed.xml (channel)", channel);
  assert.deepEqual(hits, [], `Write "Suede" instead:\n${hits.join("\n")}`);
});
