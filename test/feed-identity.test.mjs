import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { buildRSS, SHOW } from "../feed-template.mjs";
import { parseEpisodes } from "../regen-feed.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const feed = readFileSync(join(root, "public", "feed.xml"), "utf8");
const episodes = parseEpisodes(feed);

const PERSON_ID = "https://suedeai.ai/founder#person";
const CANONICAL_NAME = "Jason Colapietro";

const channel = feed.slice(0, feed.indexOf("<item>"));
const items = feed.match(/<item>[\s\S]*?<\/item>/g) ?? [];

/**
 * The feed is generated output. This is the guard that keeps it that way: if
 * someone edits public/feed.xml by hand, or changes the template without
 * re-rendering, the committed XML stops matching what the template produces and
 * this fails. Two earlier defects in this estate came from hand-edited
 * generated files.
 */
test("public/feed.xml is exactly what the generator produces", () => {
  assert.ok(episodes.length > 0, "expected the feed to parse into episodes");
  assert.equal(
    `${buildRSS(episodes)}\n`,
    feed,
    "public/feed.xml differs from feed-template.mjs output — run: node regen-feed.mjs",
  );
});

test("a prefixed tag is only used when its namespace is declared on <rss>", () => {
  const root_ = feed.slice(0, feed.indexOf("<channel>"));
  const declared = new Set(
    [...root_.matchAll(/xmlns:([A-Za-z0-9_-]+)=/g)].map((m) => m[1]),
  );
  const used = new Set(
    [...feed.matchAll(/<([A-Za-z0-9_-]+):[A-Za-z0-9_-]+/g)].map((m) => m[1]),
  );
  for (const prefix of used) {
    assert.ok(declared.has(prefix), `<${prefix}:…> used but xmlns:${prefix} is not declared`);
  }
  assert.ok(declared.has("dc"), "expected the Dublin Core namespace to be declared");
});

test("the channel names the canonical person as author, editor and webmaster", () => {
  assert.match(channel, /<dc:creator>Jason Colapietro<\/dc:creator>/);
  assert.match(channel, /<itunes:author>Jason Colapietro<\/itunes:author>/);
  // RSS 2.0 spells these as an address followed by the name in parentheses.
  assert.match(
    channel,
    new RegExp(`<managingEditor>${SHOW.email} \\(${CANONICAL_NAME}\\)</managingEditor>`),
  );
  assert.match(
    channel,
    new RegExp(`<webMaster>${SHOW.email} \\(${CANONICAL_NAME}\\)</webMaster>`),
  );
});

test("every item carries the canonical person, not only the alias", () => {
  assert.ok(items.length > 0, "expected items in the feed");
  for (const item of items) {
    assert.match(item, /<itunes:author>Jason Colapietro<\/itunes:author>/);
    assert.match(item, /<dc:creator>Jason Colapietro<\/dc:creator>/);
  }
});

test("the feed's public contact is an estate address, never a personal mailbox", () => {
  assert.match(feed, /<itunes:email>info@suedeai\.ai<\/itunes:email>/);
  assert.doesNotMatch(feed, /@gmail\.com/i, "a personal mailbox must never ship in the feed");
});

test("the host is linked to the canonical Person URL", () => {
  assert.match(
    channel,
    /<podcast:person role="host" href="https:\/\/suedeai\.ai\/founder">Jason Colapietro<\/podcast:person>/,
  );
});

/**
 * Satellite pages should point at the canonical Person by @id and let the node
 * at https://suedeai.ai/founder supply jobTitle, description, sameAs and image.
 * A thin name/url copy repeated across 30+ pages competes with the record it
 * was meant to reference.
 */
test("no page restates a thinner copy of the canonical Person", () => {
  const pages = [
    join(root, "public", "index.html"),
    join(root, "public", "about.html"),
    join(root, "public", "contact.html"),
    join(root, "public", "appearances", "index.html"),
    ...readdirSync(join(root, "public", "episodes"))
      .filter((n) => n.endsWith(".html"))
      .map((n) => join(root, "public", "episodes", n)),
  ];

  let references = 0;
  for (const page of pages) {
    const html = readFileSync(page, "utf8");
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.ok(blocks.length > 0, `${page} has no JSON-LD`);

    for (const [, raw] of blocks) {
      const data = JSON.parse(raw); // also the parse gate for every block
      const walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (!node || typeof node !== "object") return;
        if (node["@id"] === PERSON_ID) {
          references += 1;
          assert.deepEqual(
            Object.keys(node),
            ["@id"],
            `${page} restates the canonical Person instead of referencing it`,
          );
        }
        Object.values(node).forEach(walk);
      };
      walk(data);
    }
  }
  assert.ok(references > 0, "expected the canonical Person to be referenced somewhere");
});

test("the Organization points at the real Suede Labs AI Wikidata entity", () => {
  for (const name of ["index.html", "about.html", "contact.html"]) {
    const html = readFileSync(join(root, "public", name), "utf8");
    // Q131489584 is a Cameroonian lawyer, not this company.
    assert.doesNotMatch(html, /Q131489584/, `${name} cites the wrong Wikidata entity`);
    if (html.includes('"@type": "Organization"')) {
      assert.match(html, /wikidata\.org\/wiki\/Q141169484/, `${name} is missing the org's Wikidata ID`);
    }
  }
});
