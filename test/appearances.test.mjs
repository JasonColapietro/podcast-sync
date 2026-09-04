import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { parseEpisodes } from "../build-episodes.mjs";
import {
  APPEARANCES,
  ENTITIES,
  HOSTED,
  PROGRAMMES,
  creditSentence,
  guestSentence,
  participationProperty,
} from "../appearances.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PUBLIC = join(root, "public");
const episodesDir = join(PUBLIC, "episodes");
const feed = readFileSync(join(PUBLIC, "feed.xml"), "utf8");
const episodes = parseEpisodes(feed);
const bySlug = new Map(episodes.map((e) => [e.slug, e]));

const PERSON_ID = "https://suedeai.ai/founder#person";
const APPEARANCES_URL = "https://podcast.suedeai.ai/appearances";

/** The exact source text a credit may be drawn from: this episode's own copy. */
const copyFor = (slug) => `${bySlug.get(slug).title}\n${bySlug.get(slug).descriptionHtml}`;
/** The whole feed, for facts stated on one page about an entity credited on several. */
const CORPUS = episodes.map((e) => `${e.title}\n${e.descriptionHtml}`).join("\n");

const jsonLdBlocks = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    ([, raw]) => raw,
  );

const nodesOf = (data) => {
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    out.push(node);
    Object.values(node).forEach(walk);
  };
  walk(data);
  return out;
};

const graphFor = (slug) => {
  const html = readFileSync(join(episodesDir, `${slug}.html`), "utf8");
  const blocks = jsonLdBlocks(html);
  assert.equal(blocks.length, 1, `${slug}: expected exactly one JSON-LD block`);
  return JSON.parse(blocks[0])["@graph"];
};

const episodeNode = (slug) => graphFor(slug).find((n) => n["@type"] === "PodcastEpisode");

// ---------------------------------------------------------------------------
// The invention rule. Every name published as a third-party credit has to be a
// string somebody already wrote in the show notes — this is the only thing
// standing between "documented appearance" and "made-up credit", on an estate
// whose entire positioning is provenance.
// ---------------------------------------------------------------------------

test("the three buckets partition the feed exactly once", () => {
  assert.equal(episodes.length, 33);
  const claimed = [...Object.keys(APPEARANCES), ...Object.keys(HOSTED)];
  assert.equal(new Set(claimed).size, claimed.length, "a slug is classified twice");
  for (const slug of claimed) {
    assert.ok(bySlug.has(slug), `${slug} is classified but is not in the feed`);
  }
  assert.equal(Object.keys(APPEARANCES).length, 20);
  // The five the copy could not resolve, now confirmed by the operator as his.
  assert.equal(Object.keys(HOSTED).length, 5);
  // The remaining eight name no third party at all and need no entry.
  assert.equal(episodes.filter((e) => !APPEARANCES[e.slug] && !HOSTED[e.slug]).length, 8);
});

for (const [slug, appearance] of Object.entries(APPEARANCES)) {
  test(`${slug}: every credited name is quoted from this episode's own show notes`, () => {
    const copy = copyFor(slug);

    for (const quote of appearance.evidence) {
      assert.ok(
        copy.includes(quote),
        `evidence ${JSON.stringify(quote)} does not appear in this episode's feed copy`,
      );
    }

    const programme = appearance.programme ? PROGRAMMES[appearance.programme] : null;
    if (appearance.programme) {
      assert.ok(programme, `unknown programme ${appearance.programme}`);
      assert.ok(
        copy.includes(programme.name),
        `programme name ${JSON.stringify(programme.name)} is not in this episode's copy`,
      );
    }

    const keys = [...appearance.producers, programme?.host, programme?.publisher].filter(Boolean);
    assert.ok(
      keys.length || appearance.programme,
      "an appearance must credit a host, a programme, or both",
    );
    for (const key of keys) {
      const entity = ENTITIES[key];
      assert.ok(entity, `unknown entity ${key}`);
      assert.ok(
        copy.includes(entity.name),
        `entity name ${JSON.stringify(entity.name)} is not in this episode's copy`,
      );
    }
  });
}

test("no handle or URL is published that the feed does not state", () => {
  for (const [key, entity] of Object.entries(ENTITIES)) {
    if (entity.handle) {
      assert.ok(CORPUS.includes(entity.handle), `${key}: handle ${entity.handle} is not in the feed`);
    }
    if (entity.url) {
      assert.ok(CORPUS.includes(entity.url), `${key}: url ${entity.url} is not in the feed`);
    }
  }
});

/**
 * A handle is not a link. The feed writes "@Binance" and "@Block"; resolving
 * either into an account URL would be a guess, and a wrong link on a credit is
 * worse than no link. Only the one host whose full URL the notes print gets a
 * `url` / `sameAs`.
 */
test("a link is only published where the show notes print the whole URL", () => {
  const linked = Object.entries(ENTITIES).filter(([, e]) => e.url);
  assert.deepEqual(linked.map(([k]) => k), ["matthewjmalek"]);
  for (const [, e] of linked) assert.match(e.url, /^https:\/\//);
});

// ---------------------------------------------------------------------------
// What the generated markup must say.
// ---------------------------------------------------------------------------

for (const slug of Object.keys(APPEARANCES)) {
  test(`${slug}: credits the host and no longer claims authorship`, () => {
    const node = episodeNode(slug);

    assert.ok(!("author" in node), "an appearance on someone else's show must not carry author");
    assert.ok(Array.isArray(node.actor), "expected actor");
    assert.deepEqual(node.actor[0], { "@id": PERSON_ID }, "he must still be credited, as a guest");

    // The feed genuinely carries the recording, so this stays pointed at it.
    assert.deepEqual(node.partOfSeries, { "@id": "https://podcast.suedeai.ai/#podcast" });

    // Every @id the episode references must be defined in the same graph.
    const graph = graphFor(slug);
    const defined = new Set(graph.map((n) => n["@id"]).filter(Boolean));
    const referenced = [
      ...node.actor.map((a) => a["@id"]),
      ...(node.producer ?? []).map((p) => p["@id"]),
      ...(node.isBasedOn ? [node.isBasedOn["@id"]] : []),
    ];
    for (const id of referenced) {
      if (id === PERSON_ID) continue; // supplied by the canonical record off-site
      assert.ok(defined.has(id), `${id} is referenced but never defined on the page`);
    }

    // Prose and structured data must agree about who hosted it.
    const html = readFileSync(join(episodesDir, `${slug}.html`), "utf8");
    assert.ok(html.includes(creditSentence(slug)), "the visible credit line is missing");
    assert.ok(!html.includes("Ship</a> by"), "the footer still calls this his own episode");
  });
}

// ---------------------------------------------------------------------------
// The five he hosted. These are the inverse of an appearance — he is the author,
// the named third party is the guest, and nobody else produced them — so they
// have to be checked from the opposite direction. The invention rule does not
// change: a guest's name still has to be a string this episode's own copy
// already contains, and a resolved episode is not a licence to name someone the
// notes never named.
// ---------------------------------------------------------------------------

for (const [slug, hosted] of Object.entries(HOSTED)) {
  test(`${slug}: every credited guest name is quoted from this episode's own show notes`, () => {
    const copy = copyFor(slug);

    for (const quote of hosted.evidence) {
      assert.ok(
        copy.includes(quote),
        `evidence ${JSON.stringify(quote)} does not appear in this episode's feed copy`,
      );
    }

    for (const key of hosted.guests) {
      const entity = ENTITIES[key];
      assert.ok(entity, `unknown entity ${key}`);
      assert.ok(
        copy.includes(entity.name),
        `guest name ${JSON.stringify(entity.name)} is not in this episode's copy`,
      );
    }

    // A guest credit without a quote behind it is the failure this file exists
    // to catch; an episode with no guest must not carry stray evidence either.
    assert.equal(
      hosted.evidence.length > 0,
      hosted.guests.length > 0,
      "evidence and guests must appear together or not at all",
    );
    assert.ok(hosted.note, "a resolved episode must record what its copy does and does not say");
  });

  test(`${slug}: he authored it, and any third party is the guest`, () => {
    const node = episodeNode(slug);

    assert.deepEqual(node.author, { "@id": PERSON_ID }, "he hosted this one, so he is the author");
    assert.ok(!("producer" in node), "he owned the programme — nobody else produced it");
    assert.ok(!("isBasedOn" in node), "this is the original, not a re-run of someone else's show");
    assert.deepEqual(node.partOfSeries, { "@id": "https://podcast.suedeai.ai/#podcast" });

    const html = readFileSync(join(episodesDir, `${slug}.html`), "utf8");
    assert.ok(html.includes("Ship</a> by"), "his own episode must still be footered as his");

    if (!hosted.guests.length) {
      assert.ok(!("actor" in node), "the copy names no third party, so no guest may be credited");
      assert.ok(!("contributor" in node), "the copy names no third party — no guest, either kind");
      assert.equal(guestSentence(slug), null, "no guest, no visible guest credit");
      return;
    }

    // A guest is credited under the property THE TYPE RULE gives its type: a
    // Person under `actor`, an organisation under `contributor`. The role is the
    // same either way, so the test reads the property the rule chooses rather
    // than assuming one.
    for (const property of ["actor", "contributor"]) {
      const expected = hosted.guests.filter((k) => participationProperty(k) === property);
      if (!expected.length) {
        assert.ok(!(property in node), `nothing belongs under \`${property}\` on this episode`);
        continue;
      }
      assert.ok(Array.isArray(node[property]), `the named third party is missing from \`${property}\``);
      assert.ok(
        !node[property].some((a) => a["@id"] === PERSON_ID),
        "on his own episode he is the author, not a guest — that is the whole distinction",
      );

      // Resolve each credited guest to its definition in the same graph and
      // check the published name against the feed, as appearance pages are.
      const defined = new Map(
        graphFor(slug).filter((n) => n["@id"] && n["@type"]).map((n) => [n["@id"], n]),
      );
      const credited = node[property].map(({ "@id": id }) => {
        const guest = defined.get(id);
        assert.ok(guest, `${id} is credited as a guest but is never defined on the page`);
        assert.ok(CORPUS.includes(guest.name), `${id}: guest name is not in the feed`);
        if (guest.alternateName) {
          assert.ok(CORPUS.includes(guest.alternateName), `${id}: handle is not in the feed`);
        }
        assert.ok(!("url" in guest), `${id}: the notes print no link for this guest`);
        return guest.name;
      });
      assert.deepEqual(
        credited,
        expected.map((k) => ENTITIES[k].name),
        `the guests credited under \`${property}\` are not the ones the table names`,
      );
    }

    // Prose and structured data must agree about who was the guest.
    assert.ok(html.includes(guestSentence(slug)), "the visible guest credit is missing");
  });
}

test("the hosted episodes exercise both branches of the type rule", () => {
  const guests = [...new Set(Object.values(HOSTED).flatMap((h) => h.guests))];
  const under = (property) => guests.filter((k) => participationProperty(k) === property);
  assert.ok(under("actor").length, "no Person guest — the actor branch is untested");
  assert.ok(under("contributor").length, "no Organization guest — the contributor branch is untested");
});

test("episodes he made keep him as author", () => {
  const own = episodes.filter((e) => !APPEARANCES[e.slug] && !HOSTED[e.slug]);
  assert.equal(own.length, 8);
  for (const e of own) {
    const node = episodeNode(e.slug);
    assert.deepEqual(node.author, { "@id": PERSON_ID }, `${e.slug} lost its author`);
    assert.ok(!("producer" in node), `${e.slug} credits a third party it has no evidence for`);
    assert.ok(!("actor" in node), `${e.slug} names a guest its copy never named`);
    assert.ok(!("contributor" in node), `${e.slug} names a guest its copy never named`);
  }
});

/**
 * THE TYPE RULE, enforced against what actually shipped.
 *
 * schema.org ranges `actor` to Person; `contributor` and `producer` range to
 * Organization and Person alike. A property used outside its range is what a
 * strict consumer discards, so an off-spec credit is nearer to no credit than to
 * a correct one — which would defeat the whole point of publishing it.
 *
 * This reads the generated pages rather than the table, so it catches a credit
 * that went out under the wrong property however it got there.
 */
const RANGE = {
  actor: ["Person"],
  contributor: ["Person", "Organization"],
  producer: ["Person", "Organization"],
};

test("no entity is credited under a property its type is out of range for", () => {
  let checked = 0;
  const seen = new Set();

  for (const e of episodes) {
    const graph = graphFor(e.slug);
    const typeOf = new Map(
      graph.filter((n) => n["@id"] && n["@type"]).map((n) => [n["@id"], n["@type"]]),
    );
    const node = graph.find((n) => n["@type"] === "PodcastEpisode");

    for (const [property, allowed] of Object.entries(RANGE)) {
      if (!(property in node)) continue;
      for (const ref of [].concat(node[property])) {
        // The canonical Person is described off-site, at https://suedeai.ai/founder.
        const type = ref["@id"] === PERSON_ID ? "Person" : typeOf.get(ref["@id"]);
        assert.ok(type, `${e.slug}: ${ref["@id"]} is credited but never defined on the page`);
        assert.ok(
          allowed.includes(type),
          `${e.slug}: ${type} is out of range for \`${property}\` (allowed: ${allowed.join(", ")})`,
        );
        seen.add(`${property}:${type}`);
        checked += 1;
      }
    }
  }

  // Non-vacuous: this has to have actually looked at credits, and at both kinds
  // of entity, or it is asserting nothing.
  assert.ok(checked >= 27, `expected the whole feed's credits, checked ${checked}`);
  assert.ok(seen.has("actor:Person"), "no Person was checked under actor");
  assert.ok(
    [...seen].some((k) => k.endsWith(":Organization")),
    "no Organization was checked at all",
  );
});

test("the table routes each entity to a property its type is in range for", () => {
  const byProperty = { actor: 0, contributor: 0 };
  for (const key of Object.keys(ENTITIES)) {
    const property = participationProperty(key);
    assert.ok(
      RANGE[property].includes(ENTITIES[key].type),
      `${key}: ${ENTITIES[key].type} routed to \`${property}\`, which is out of range for it`,
    );
    byProperty[property] += 1;
  }
  // Both branches of the rule are exercised by the real table.
  assert.ok(byProperty.actor > 0, "no Person in the table");
  assert.ok(byProperty.contributor > 0, "no Organization in the table");
});

/**
 * The parse gate. A regex bulk edit once broke 81 JSON-LD blocks in this estate
 * silently, because nothing read them back. Every block on every generated and
 * static page is parsed here, so a malformed one fails the build.
 */
test("every JSON-LD block on every page parses", () => {
  const pages = [
    join(PUBLIC, "index.html"),
    join(PUBLIC, "about.html"),
    join(PUBLIC, "contact.html"),
    join(PUBLIC, "appearances", "index.html"),
    ...readdirSync(episodesDir)
      .filter((n) => n.endsWith(".html"))
      .map((n) => join(episodesDir, n)),
  ];
  assert.equal(pages.length, 37);

  let blocks = 0;
  for (const page of pages) {
    const found = jsonLdBlocks(readFileSync(page, "utf8"));
    assert.ok(found.length > 0, `${page} has no JSON-LD`);
    for (const raw of found) {
      JSON.parse(raw); // throws with the offending page named by the assertion above
      blocks += 1;
    }
  }
  assert.ok(blocks >= 37, `expected a block per page, parsed ${blocks}`);
});

// ---------------------------------------------------------------------------
// /appearances — the one URL a journalist or an answer engine can cite.
// ---------------------------------------------------------------------------

test("the appearances index lists every appearance and nothing else", () => {
  const html = readFileSync(join(PUBLIC, "appearances", "index.html"), "utf8");
  const graph = JSON.parse(jsonLdBlocks(html)[0])["@graph"];

  const page = graph.find((n) => n["@type"] === "CollectionPage");
  assert.ok(page, "expected a CollectionPage");
  assert.deepEqual(page.about, { "@id": PERSON_ID }, "the page must be about the canonical Person");
  assert.equal(page.url, APPEARANCES_URL);

  const list = graph.find((n) => n["@type"] === "ItemList");
  assert.ok(list, "expected an ItemList");
  assert.equal(list.numberOfItems, Object.keys(APPEARANCES).length);
  assert.equal(list.itemListElement.length, Object.keys(APPEARANCES).length);

  const listed = new Set(list.itemListElement.map((i) => i.url));
  for (const slug of Object.keys(APPEARANCES)) {
    assert.ok(listed.has(bySlug.get(slug).url), `${slug} is missing from the ItemList`);
    assert.ok(html.includes(`href="/episodes/${slug}"`), `${slug} has no link on the page`);
  }
  // The five he hosted are not appearances and must not be listed here — the
  // page is "where he has been a guest", and on these he was the host.
  for (const slug of Object.keys(HOSTED)) {
    assert.ok(!html.includes(`href="/episodes/${slug}"`), `${slug} is his own but listed`);
  }

  // Positions are contiguous from 1, so the list is a real ordered list.
  assert.deepEqual(
    list.itemListElement.map((i) => i.position),
    list.itemListElement.map((_, i) => i + 1),
  );

  // Every host and programme node is described here, named, and never faked.
  // Definitions carry an @type; a bare {"@id": …} is a reference to one.
  let described = 0;
  for (const node of nodesOf(graph)) {
    const id = node["@id"];
    if (typeof id !== "string" || !id.startsWith(`${APPEARANCES_URL}#`)) continue;
    if (!node["@type"]) continue;
    if (id.endsWith("#webpage") || id.endsWith("#list")) continue;
    assert.ok(node.name, `${id} has no name`);
    assert.ok(CORPUS.includes(node.name), `${id}: name is not in the feed`);
    described += 1;
  }
  // Exactly the parties the appearances reach — no more, no fewer. Computed
  // here from APPEARANCES rather than taken from the generator, so the page is
  // checked against the classification and not against its own build helper.
  const hostKeys = new Set();
  const programmeKeys = new Set();
  for (const a of Object.values(APPEARANCES)) {
    for (const key of a.producers) hostKeys.add(key);
    if (!a.programme) continue;
    programmeKeys.add(a.programme);
    const p = PROGRAMMES[a.programme];
    if (p.host) hostKeys.add(p.host);
    if (p.publisher) hostKeys.add(p.publisher);
  }
  assert.equal(
    described,
    hostKeys.size + programmeKeys.size,
    "every host and programme must be described on this page",
  );

  // A guest who never hosted anything has no business on the appearances page.
  // ENTITIES is one registry for every third party in the feed, so this is the
  // assertion that keeps a guest credit from leaking into the host list.
  const guestOnly = [...new Set(Object.values(HOSTED).flatMap((h) => h.guests))].filter(
    (key) => !hostKeys.has(key),
  );
  assert.ok(guestOnly.length, "expected at least one guest who never hosted");
  for (const key of guestOnly) {
    assert.ok(
      !html.includes(ENTITIES[key].name),
      `${key} is a guest on his own show, not a host — it must not appear on /appearances`,
    );
  }
});

test("the appearances page is reachable and indexable", () => {
  const sitemap = readFileSync(join(PUBLIC, "sitemap.xml"), "utf8");
  assert.ok(sitemap.includes(`<loc>${APPEARANCES_URL}</loc>`), "missing from sitemap.xml");

  for (const name of ["index.html", "about.html", "contact.html"]) {
    const html = readFileSync(join(PUBLIC, name), "utf8");
    assert.ok(html.includes('href="/appearances"'), `${name} does not link to /appearances`);
  }
  assert.ok(readFileSync(join(PUBLIC, "llms.txt"), "utf8").includes("/appearances"));
});
