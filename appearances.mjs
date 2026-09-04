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
 * The remaining 13 episodes are deliberately absent: 8 carry no third party at
 * all and stay authored by him, and 5 are genuinely ambiguous about whose
 * programme they were (listed in UNCLASSIFIED with the reason). An ambiguous
 * page keeps the markup it has — guessing is the one failure mode this file
 * exists to prevent.
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
 * Episodes whose copy names a third party but never says whose programme it
 * was. These keep the markup they have. Each reason is the whole argument for
 * leaving it alone: a wrong credit on a provenance-first estate costs more than
 * a missing one, and every entry here is resolvable by one person who was
 * there.
 */
export const UNCLASSIFIED = {
  "aj-writes-crypto-and-suede-labs-ai":
    'Title names "AJ Writes Crypto" and the description is the five-word stub ' +
    '"$SUEDE Jason Colapietro Johnny Suede fireside". A fireside has a host, but the copy never says which side hosted.',
  "suede-ai-interview":
    'Title and description are both "$SUEDE AI Interview". An interview implies an interviewer; none is named.',
  "x-spaces-when-suede-ai-suede-is-mentioned":
    'Title implies other people\'s Spaces ("X Spaces when $SUEDE AI Suede is mentioned"), but no Space, host or account is named.',
  "suede-x-metaguardians-chill-space":
    'Copy reads "Join us for an exclusive Chill Space with MetaGuardians" — "join us" reads as Suede\'s own invitation, so which side owned the Space is not stated.',
  "suede-ai-x-coinmerge-meme-culture-exclusive-voice-chat-game-changing-ai":
    'Copy reads "Join us for an exclusive voice chat with CoinMerge". CoinMerge hosts elsewhere in this feed, but this page only says "with".',
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
 * The credit to splice into one episode's JSON-LD.
 *
 *   actor      — him, by canonical @id, plus any host who is a person. `actor`
 *                is what schema.org gives a CreativeWork for "appeared in";
 *                PodcastEpisode has no `guest`.
 *   producer   — the parties who put the recording on. This is the third-party
 *                credit that was missing entirely.
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

  const hostPeople = a.producers.filter((k) => ENTITIES[k].type === "Person");
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
