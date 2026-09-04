/**
 * Who actually hosted each episode.
 *
 * The feed republishes two different kinds of recording under one roof:
 * episodes Jason Colapietro made, and appearances he made as a guest on other
 * people's shows — Binance and Block AMAs, Mario Nawfal's Crypto Roundtable,
 * CoinMerge's Sol Train, DigiFinex's DigiTalk, and so on. The generated pages
 * treated both the same way: `author` was always the canonical Person and
 * `partOfSeries` was always his own feed, so ~20 documented appearances on
 * notable third-party programmes read, to a machine, as 20 episodes of his own
 * self-published show. Third-party credit is the scarce kind, and none of it
 * was being claimed.
 *
 * This module is the classification, and nothing else — no file I/O, no HTML.
 * build-episodes.mjs consumes it to emit the credit on each episode page and to
 * build /appearances; the tests consume it to prove nothing here was invented.
 *
 * THE INVENTION RULE
 * ------------------
 * Every name below is a string that appears verbatim in the episode's own feed
 * copy (title + description). Nothing is supplied from outside the feed:
 *
 *   - `name`      must appear verbatim in the copy of EVERY episode credited to
 *                 that entity.
 *   - `handle`    the @handle exactly as the copy writes it, and it must appear
 *                 verbatim somewhere in the feed. Published as `alternateName`,
 *                 not resolved into a URL: the copy states a handle, not a link,
 *                 and guessing which account a handle belongs to is exactly the
 *                 kind of unverifiable credit that is worse than no credit.
 *                 ("@Block", for one, is not obviously a single account.)
 *   - `url`       ONLY where the copy prints the full URL. Exactly one episode
 *                 does: "Hosted by → https://x.com/matthewjmalek".
 *   - `evidence`  the verbatim quote that establishes the credit.
 *
 * test/appearances.test.mjs enforces all four against public/feed.xml, so a
 * credit that drifts from the source copy fails the build rather than shipping.
 *
 * The remaining 13 episodes are his own. Five of them named a third party
 * without ever saying who hosted, and were held back in an UNCLASSIFIED bucket
 * rather than guessed at; the operator has since confirmed he hosted all five.
 * They now sit in HOSTED, which is the exact inverse of an appearance: he is the
 * `author`, and where the notes name a third party, that party is the GUEST
 * (`actor`) rather than the programme's owner. The other eight name nobody and
 * need no entry at all.
 */

const SITE = "https://podcast.suedeai.ai";
export const APPEARANCES_URL = `${SITE}/appearances`;

/**
 * The people and organisations that hosted these recordings.
 * `name` is the form the feed copy uses; `handle` is the @handle it writes.
 */
export const ENTITIES = {
  "mario-nawfal": { type: "Person", name: "Mario Nawfal", handle: "@MarioNawfal" },
  "fity-eth": { type: "Person", name: "Fity.eth", handle: "@Fity_eth" },
  // The only third party whose link the feed actually prints.
  matthewjmalek: {
    type: "Person",
    name: "matthewjmalek",
    handle: "@matthewjmalek",
    url: "https://x.com/matthewjmalek",
  },
  binance: { type: "Organization", name: "Binance", handle: "@Binance" },
  block: { type: "Organization", name: "Block", handle: "@Block" },
  coinmerge: { type: "Organization", name: "CoinMerge", handle: "@CoinMerge" },
  btse: { type: "Organization", name: "BTSE", handle: "@BTSE_Official" },
  digifinex: { type: "Organization", name: "DigiFinex", handle: "@DigiFinex" },
  "apex-exchange": { type: "Organization", name: "APEX Exchange", handle: "@APEX_Exchange" },
  // Guests on his own episodes (see HOSTED). The feed writes each name and
  // nothing else — no @handle, no link — so each node is a name and a type.
  // "AJ Writes Crypto" is the whole of what the copy gives: the title names it
  // and the description calls the recording a "fireside", which is a thing two
  // people do, so Person is the type the copy supports. MetaGuardians is spoken
  // of as a project alongside $SUEDE ("What’s next for $SUEDE and
  // MetaGuardians"), so Organization is.
  "aj-writes-crypto": { type: "Person", name: "AJ Writes Crypto" },
  metaguardians: { type: "Organization", name: "MetaGuardians" },
};

/**
 * Named programmes — only where the copy names an actual show, not merely the
 * platform an AMA happened on. "Binance AMA" is a description of an event, so
 * it gets no node; "Sol Train" and "DigiTalk" are programmes, so they do.
 */
export const PROGRAMMES = {
  "crypto-roundtable": { type: "PodcastSeries", name: "Crypto Roundtable", host: "mario-nawfal" },
  "binance-live": { type: "PodcastSeries", name: "Binance Live", publisher: "binance" },
  "sol-train": { type: "PodcastSeries", name: "Sol Train", publisher: "coinmerge" },
  digitalk: { type: "PodcastSeries", name: "DigiTalk", publisher: "digifinex" },
  // No handle, no URL, no platform named anywhere in the copy — just the show's
  // name. Named without a link, which is the honest form of this credit.
  "crypto-shogun": { type: "PodcastSeries", name: "Crypto Shogun" },
};

/**
 * slug -> who hosted it.
 *
 * `producers` lists the parties that put the recording on, most significant
 * first (that first entry is how /appearances groups the episode). `programme`
 * names the show when the copy names one. `evidence` is the quote the credit
 * rests on.
 */
export const APPEARANCES = {
  "stop-losing-rights-own-your-ip-music-rwas-ai-x402-on-base-jason-colapiet": {
    producers: ["matthewjmalek"],
    programme: null,
    evidence: ["Hosted by → https://x.com/matthewjmalek", "sits down with @matthewjmalek"],
  },
  "mario-nawfal-jason-colapietro-ai-music-and-the-future-of-culture": {
    producers: ["mario-nawfal"],
    programme: null,
    evidence: ["Hosted by @MarioNawfal"],
  },
  "mario-nawfal-suede-labs-the-web3-music-stack-explained": {
    producers: ["mario-nawfal"],
    programme: null,
    evidence: ["Hosted by @MarioNawfal"],
  },
  "mario-nawfal-jason-colapietro-protecting-artist-identity-from-ai-agents": {
    producers: ["mario-nawfal"],
    programme: null,
    evidence: ["Hosted by @MarioNawfal"],
  },
  "suede-ai-ama-portion-of-mario-nawfal-crypto-roundtable-crypto-ai": {
    producers: ["mario-nawfal"],
    programme: "crypto-roundtable",
    evidence: ["AMA segment from Mario Nawfal", "Crypto Roundtable"],
  },
  "binance-ama-suede-labs-on-the-music-ip-stack-full-recap": {
    producers: ["binance"],
    programme: null,
    evidence: ["Hosted on @Binance", "Full recap of the Binance AMA"],
  },
  "binance-suede-labs-ai-music-web3-creativity-full-ama": {
    producers: ["binance"],
    programme: null,
    evidence: ["Hosted on @Binance", "Binance AMA with Jason Colapietro"],
  },
  "binance-livestream-ama-suede-labs-founder-on-music-ip": {
    producers: ["binance"],
    programme: null,
    evidence: ["Hosted on @Binance", "Binance Livestream AMA with Jason Colapietro"],
  },
  "binance-and-suede-crypto-ai-agents": {
    producers: ["binance"],
    programme: "binance-live",
    evidence: ["sit down with Binance Live"],
  },
  "block-suede-labs-how-on-chain-royalties-actually-work": {
    producers: ["block"],
    programme: null,
    evidence: ["Hosted on @Block", "Block AMA with Jason Colapietro"],
  },
  "block-suede-labs-ama-the-music-stack-on-base": {
    producers: ["block"],
    programme: null,
    evidence: ["Hosted on @Block", "Block AMA with Jason Colapietro"],
  },
  "block-suede-labs-chill-ama-the-future-of-ai-in-music-web3": {
    producers: ["block"],
    programme: null,
    evidence: ["Hosted on @Block", "Casual Block AMA with Jason Colapietro"],
  },
  "block-suede-labs-weekly-build-update-march-6-2025": {
    producers: ["block"],
    programme: null,
    evidence: ["Hosted on @Block", "update on @Block"],
  },
  "fity-eth-suede-labs-the-dark-truth-about-crypto-launches": {
    producers: ["fity-eth", "block"],
    programme: null,
    evidence: ["Hosted by @Fity_eth on Block"],
  },
  "coinmerge-fity-eth-on-suede-labs-sol-train": {
    producers: ["coinmerge", "fity-eth"],
    programme: "sol-train",
    evidence: ["Hosted on @CoinMerge with @Fity_eth", "CoinMerge's Sol Train hosts"],
  },
  "coinmerge-reviews-suede-is-the-music-crypto-thesis-real": {
    producers: ["coinmerge"],
    programme: null,
    evidence: ["Hosted on @CoinMerge", "CoinMerge takes the Suede Labs thesis seriously"],
  },
  "btse-suede-labs-redefining-the-music-industry-with-crypto-ai": {
    producers: ["btse"],
    programme: null,
    evidence: ["Hosted on @BTSE_Official", "BTSE AMA with Jason Colapietro"],
  },
  "digifinex-suede-labs-ep-15-where-ai-and-music-are-headed": {
    producers: ["digifinex"],
    programme: "digitalk",
    evidence: ["Hosted on @DigiFinex", "DigiTalk Episode 15 with Jason Colapietro"],
  },
  "apex-exchange-suede-labs-ai-music-crypto-distribution": {
    producers: ["apex-exchange"],
    programme: null,
    evidence: ["Hosted on @APEX_Exchange", "APEX Exchange AMA with Jason Colapietro"],
  },
  "suede-ai-on-crypto-shogun-discussing-musician-benefits-and-tokenomics-cr": {
    producers: [],
    programme: "crypto-shogun",
    evidence: ["Exclusive Interview on Crypto Shogun"],
  },
};

/**
 * slug -> episodes he hosted himself.
 *
 * These five were the UNCLASSIFIED bucket: each names a third party (or, twice,
 * names nobody at all) without the copy ever stating whose programme it was, so
 * rather than guess, the pages were left alone. The operator — the one person
 * who was there — has since confirmed he hosted all five. That makes them the
 * inverse of an appearance: `author` is him, `partOfSeries` is his feed, and the
 * named third party is the GUEST, not the programme's owner. No `producer` and
 * no `isBasedOn`, because nobody else put these on.
 *
 * `guests` is empty where the copy names no third party. Confirming he hosted an
 * episode says nothing about who else was in the room, and the invention rule
 * does not bend for a resolved episode: an unnamed guest stays unnamed.
 *
 * `evidence` is the verbatim quote the guest credit rests on, checked against
 * this episode's own copy by test/appearances.test.mjs. `note` records what the
 * copy does and does not say, so a later reader can see which part of each entry
 * is quoted and which part is the operator's confirmation.
 */
export const HOSTED = {
  "aj-writes-crypto-and-suede-labs-ai": {
    guests: ["aj-writes-crypto"],
    evidence: ["AJ Writes Crypto and Suede Labs AI", "$SUEDE Jason Colapietro Johnny Suede fireside"],
    note:
      'Title names "AJ Writes Crypto"; the description is the five-word stub ' +
      '"$SUEDE Jason Colapietro Johnny Suede fireside". The copy never said which side hosted the fireside. It was his.',
  },
  "suede-ai-interview": {
    guests: [],
    evidence: [],
    note:
      'Title and description are both "$SUEDE AI Interview". An interview implies an interviewer, but the copy names ' +
      "no one, so this stays his episode with no guest credited.",
  },
  "x-spaces-when-suede-ai-suede-is-mentioned": {
    guests: [],
    evidence: [],
    note:
      'Title reads "X Spaces when $SUEDE AI Suede is mentioned." and the description is the stub "Suede ai". No Space, ' +
      "host or account is named anywhere, so this stays his episode with no guest credited.",
  },
  "suede-x-metaguardians-chill-space": {
    guests: ["metaguardians"],
    evidence: [
      "Join us for an exclusive **Chill Space** with **MetaGuardians**",
      "What’s next for $SUEDE and MetaGuardians",
    ],
    note:
      '"Join us for an exclusive Chill Space with MetaGuardians" — the "join us" was his, and MetaGuardians was the guest.',
  },
  "suede-ai-x-coinmerge-meme-culture-exclusive-voice-chat-game-changing-ai": {
    guests: ["coinmerge"],
    evidence: [
      "$SUEDE AI x CoinMerge Meme Culture",
      "Join us for an exclusive voice chat with CoinMerge",
    ],
    note:
      'Copy reads "Join us for an exclusive voice chat with CoinMerge". CoinMerge hosts two other recordings in this ' +
      "feed and is credited as their producer; on this one it was the guest.",
  },
};

const entityId = (key) => `${APPEARANCES_URL}#${ENTITIES[key].type === "Person" ? "person" : "org"}-${key}`;
const programmeId = (key) => `${APPEARANCES_URL}#programme-${key}`;

/** JSON-LD node for a host person or hosting organisation. */
export const entityNode = (key) => {
  const e = ENTITIES[key];
  return {
    "@type": e.type,
    "@id": entityId(key),
    name: e.name,
    ...(e.handle ? { alternateName: e.handle } : {}),
    ...(e.url ? { url: e.url, sameAs: [e.url] } : {}),
  };
};

/** JSON-LD node for a named third-party programme. */
export const programmeNode = (key) => {
  const p = PROGRAMMES[key];
  return {
    "@type": p.type,
    "@id": programmeId(key),
    name: p.name,
    ...(p.host ? { author: { "@id": entityId(p.host) } } : {}),
    ...(p.publisher ? { publisher: { "@id": entityId(p.publisher) } } : {}),
  };
};

export const appearanceFor = (slug) => APPEARANCES[slug] ?? null;
export const isAppearance = (slug) => Boolean(APPEARANCES[slug]);

/** Every entity key an appearance touches, producers and programme alike. */
const entityKeysFor = (a) => {
  const keys = [...a.producers];
  const p = a.programme ? PROGRAMMES[a.programme] : null;
  if (p?.host) keys.push(p.host);
  if (p?.publisher) keys.push(p.publisher);
  return [...new Set(keys)];
};

/**
 * THE TYPE RULE
 * -------------
 * Which property an entity may be published under, for the "took part in this
 * recording" claim. The entity's TYPE decides it — never its role.
 *
 *   Person        -> `actor`
 *   Organization  -> `contributor`
 *
 * schema.org ranges `actor` to Person (and PerformingGroup); an Organization
 * there is out of range. `contributor` ranges to Organization and Person, so it
 * carries the same claim for a non-person without leaving the schema. This is
 * not pedantry: the entire point of this markup is that a machine reads it, and
 * an out-of-range property is exactly what a strict parser drops — an off-spec
 * credit is closer to no credit at all than to a correct one, which would defeat
 * the change. PodcastEpisode has no `guest`, so these two are what there is.
 *
 * `producer` is deliberately outside this rule: it already ranges to
 * Organization and Person, and it says something narrower and better than either
 * ("put the recording on"), so an organisation that produced a recording is
 * credited there rather than demoted to a vaguer property.
 */
export const participationProperty = (key) =>
  ENTITIES[key].type === "Person" ? "actor" : "contributor";

/** Split entity keys into the participation property each one belongs under. */
export const byParticipation = (keys) => {
  const split = { actor: [], contributor: [] };
  for (const key of keys) split[participationProperty(key)].push(key);
  return split;
};

/**
 * The credit to splice into one episode's JSON-LD.
 *
 *   actor      — him, by canonical @id, plus any host who is a Person. Hosts
 *                that are organisations are not listed here: see THE TYPE RULE.
 *   producer   — the parties who put the recording on, Person and Organization
 *                alike. This is the third-party credit that was missing
 *                entirely, and it is where an organisation that hosted a
 *                recording is credited.
 *   isBasedOn  — the named original programme, where the copy names one.
 *   author     — deliberately absent. He did not author these, and the copy
 *                does not reliably say who did.
 *
 * `partOfSeries` is untouched by design: the republished episode genuinely is
 * part of his feed.
 */
export const episodeCredit = (slug, personId) => {
  const a = APPEARANCES[slug];
  if (!a) return null;

  // Organisations that hosted are credited by `producer` below, which is in
  // range for them and more specific than a participation property would be.
  const hostPeople = a.producers.filter((k) => participationProperty(k) === "actor");
  const nodes = entityKeysFor(a).map(entityNode);
  if (a.programme) nodes.push(programmeNode(a.programme));

  return {
    properties: {
      actor: [{ "@id": personId }, ...hostPeople.map((k) => ({ "@id": entityId(k) }))],
      ...(a.producers.length
        ? { producer: a.producers.map((k) => ({ "@id": entityId(k) })) }
        : {}),
      ...(a.programme ? { isBasedOn: { "@id": programmeId(a.programme) } } : {}),
    },
    nodes,
  };
};

/**
 * The credit to splice into one episode he hosted himself — the mirror image of
 * episodeCredit():
 *
 *   author       — him, by canonical @id. He made this one, so the claim the
 *                  appearance pages had to drop is the correct claim here.
 *   actor /      — the guest, and only the guest. He is already the author;
 *   contributor    naming him a second time as a participant on his own episode
 *                  would say nothing the author edge does not. On an appearance
 *                  he is the participant and `author` is absent; here it is the
 *                  other way round, which is exactly the distinction being
 *                  drawn. Which of the two properties a guest lands under is
 *                  THE TYPE RULE's call, not this function's: a guest who is a
 *                  Person is an `actor`, an organisation is a `contributor`.
 *                  The role is identical either way — only the type differs.
 *   producer     — absent. Nobody else put these on.
 *   isBasedOn    — absent. There is no original programme; this IS the original.
 *
 * Guest entities are minted by the same entityId() as hosts, so one third party
 * has one @id across the estate: CoinMerge hosting Sol Train and CoinMerge
 * guesting on a voice chat are the same organisation, and giving it a second
 * identifier for the second role would split it in two for anything reading the
 * graph. A guest that never hosted is described on the episode page that names
 * it rather than on /appearances, which lists only appearances.
 */
export const hostedCredit = (slug, personId) => {
  const h = HOSTED[slug];
  if (!h) return null;
  const guests = byParticipation(h.guests);
  const refs = (keys) => keys.map((k) => ({ "@id": entityId(k) }));
  return {
    properties: {
      author: { "@id": personId },
      ...(guests.actor.length ? { actor: refs(guests.actor) } : {}),
      ...(guests.contributor.length ? { contributor: refs(guests.contributor) } : {}),
    },
    nodes: h.guests.map(entityNode),
  };
};

const listNames = (keys) => {
  const names = keys.map((k) => ENTITIES[k].name);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};

/**
 * The visible credit for an episode page, built from the same table the markup
 * is. Structured data that contradicts the prose beside it is worth less than
 * either alone, so the sentence and the JSON-LD are never allowed to disagree.
 */
export const creditSentence = (slug) => {
  const a = APPEARANCES[slug];
  if (!a) return null;
  const hosts = listNames(a.producers);
  const programme = a.programme ? PROGRAMMES[a.programme].name : null;
  if (hosts && programme) return `Guest appearance on ${programme}, hosted by ${hosts}.`;
  if (hosts) return `Guest appearance, hosted by ${hosts}.`;
  return `Guest appearance on ${programme}.`;
};

/**
 * The visible credit for an episode he hosted, built from the same table as its
 * markup — same rule as creditSentence(). Null where no guest is named, so those
 * pages keep the plain "From AI Suede … by Jason Colapietro" footer they had.
 */
export const guestSentence = (slug) => {
  const h = HOSTED[slug];
  if (!h?.guests.length) return null;
  const noun = h.guests.length === 1 ? "guest" : "guests";
  return `Hosted by Jason Colapietro, with ${listNames(h.guests)} as ${noun}.`;
};

/**
 * Group appearances for the index page: one group per hosting party (the first
 * producer), or per programme when the copy named a show but no host — as with
 * Crypto Shogun. Groups ordered by size then name; episodes newest first.
 */
export const groupAppearances = (episodes) => {
  const groups = new Map();
  for (const e of episodes) {
    const a = APPEARANCES[e.slug];
    if (!a) continue;
    const key = a.producers[0] ?? `programme:${a.programme}`;
    if (!groups.has(key)) {
      const isProgramme = key.startsWith("programme:");
      const pKey = isProgramme ? key.slice("programme:".length) : null;
      groups.set(key, {
        key,
        id: isProgramme ? programmeId(pKey) : entityId(key),
        name: isProgramme ? PROGRAMMES[pKey].name : ENTITIES[key].name,
        handle: isProgramme ? null : ENTITIES[key].handle ?? null,
        url: isProgramme ? null : ENTITIES[key].url ?? null,
        episodes: [],
      });
    }
    groups.get(key).episodes.push({ episode: e, appearance: a });
  }

  for (const g of groups.values()) {
    g.episodes.sort((x, y) => (y.episode.date || "").localeCompare(x.episode.date || ""));
  }
  return [...groups.values()].sort(
    (a, b) => b.episodes.length - a.episodes.length || a.name.localeCompare(b.name),
  );
};

/** Every entity/programme node the index page describes, de-duplicated. */
export const allCreditNodes = () => {
  const nodes = new Map();
  for (const a of Object.values(APPEARANCES)) {
    for (const key of entityKeysFor(a)) nodes.set(entityId(key), entityNode(key));
    if (a.programme) nodes.set(programmeId(a.programme), programmeNode(a.programme));
  }
  return [...nodes.values()];
};
