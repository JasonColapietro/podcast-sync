/**
 * Central keyword map for every indexable page on podcast.suedeai.ai.
 *
 * Each page emits `<meta name="keywords">` built from this file: a page-specific
 * list led by the page's primary term, plus at most ONE brand term, deduped
 * case-insensitively and capped at MAX_TERMS. Static pages (home, about,
 * contact) carry the tag in their hand-written HTML; episode pages and
 * /appearances get it from build-episodes.mjs. test/keywords.test.mjs fails if
 * any indexable page ships without the tag or drifts from this map.
 *
 * Terms come from the 2026-09-08 keyword research (brand + misc + music_rights
 * + agents groups) and from what each page actually discusses. No claims.
 */

/** The one brand term a page carries when its own list names no brand. */
export const BRAND_TERM = "AI Suede Podcast";

/** Any term naming the show, the company or the host counts as brand. */
export const isBrandTerm = (term) => /suede|jason colapietro/i.test(term);

export const MAX_TERMS = 10;

/**
 * Case-insensitive dedupe (first spelling wins), keep only the first brand
 * term, append BRAND_TERM when the list has none, then trim page-specific terms
 * from the end until the list fits MAX_TERMS.
 */
export const withBrand = (terms) => {
  const seen = new Set();
  const out = [];
  let hasBrand = false;
  for (const raw of terms) {
    const term = String(raw).replace(/\s+/g, " ").trim();
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    if (isBrandTerm(term)) {
      if (hasBrand) continue;
      hasBrand = true;
    }
    seen.add(key);
    out.push(term);
  }
  if (!hasBrand) out.push(BRAND_TERM);
  while (out.length > MAX_TERMS) {
    const i = out.findLastIndex((t) => !isBrandTerm(t));
    out.splice(i, 1);
  }
  return out;
};

export const keywordContent = (terms) => withBrand(terms).join(", ");

/**
 * Topic hubs: one page per subject that several episodes' own show notes cover
 * (/topics/<slug>). An episode belongs to a hub when `match` hits its title or
 * a line of its notes, with link lines and hashtags left out (topics.mjs), so
 * membership comes from what each episode's copy says, not from its tags.
 *
 * `lede` and `short` paraphrase the notes they summarise; quotes on the hub
 * pages are the notes' own lines. `keywords` reuses terms from TOPIC_RULES
 * below. A hub needs at least MIN_HUB_EPISODES members or it is not built
 * (test/topics.test.mjs).
 */
export const MIN_HUB_EPISODES = 4;

export const TOPIC_HUBS = [
  {
    slug: "music-ip-real-world-assets",
    name: "Music IP as a real-world asset",
    title: "Music IP as a Real-World Asset (RWA): Episodes | AI Suede Podcast",
    description: (n) =>
      `${n} AI Suede Podcast recordings on music IP as a real-world asset (RWA): tokenized rights, on-chain settlement and creators who own their catalog.`,
    short: "Tokenized music rights that the people who made the work own and earn from.",
    lede:
      "Recordings whose show notes cover music IP as a real-world asset (RWA): putting the rights to a song on-chain so the people who made it own the asset and earn from it.",
    match: /real[- ]world asset|\bRWAs?\b/i,
    keywords: ["music RWA", "real-world assets", "music IP", "music rights"],
  },
  {
    slug: "music-royalties",
    name: "Music royalties and the Vault",
    title: "Music Royalties and the Vault: Episodes | AI Suede Podcast",
    description: (n) =>
      `${n} AI Suede Podcast recordings on music royalties: on-chain settlement and payouts, the delay in legacy royalty payments, and the Vault.`,
    short: "On-chain settlement and payouts, legacy royalty lag, and the Vault.",
    lede:
      "Recordings whose show notes cover music royalties: how on-chain settlement and payouts work, where the delay in legacy royalty payments comes from, and the Vault, which the notes describe as liquidity now for artists and royalty yield for supporters.",
    match: /royalt|\bvault\b/i,
    keywords: ["on-chain royalties", "music royalties", "music RWA"],
  },
  {
    slug: "music-rights-registry-and-provenance",
    name: "Rights registry and provenance",
    title: "Music Rights Registry and Provenance: Episodes | AI Suede Podcast",
    description: (n) =>
      `${n} AI Suede Podcast recordings on public records of who made a work: the Suede AI rights registry, on-chain provenance and signed artist identity.`,
    short: "Public records of who made a work: the rights registry, provenance and signatures.",
    lede:
      "Recordings whose show notes cover public records of who made a work: the Suede rights registry, on-chain provenance for tracking rights, and cryptographic signatures that tie an artist to their own catalog.",
    match: /registry|proof of authorship|provenance|signature|identity/i,
    product: "registry",
    keywords: ["music IP registry blockchain", "artist identity", "AI likeness protection", "music rights"],
  },
  {
    slug: "token-launches-and-tokenomics",
    name: "Token launches and tokenomics",
    title: "Token Launches and Tokenomics: Episodes | AI Suede Podcast",
    description: (n) =>
      `${n} AI Suede Podcast recordings on token launches and tokenomics: what goes wrong at launch, token burns, and a launchpad that pays artists.`,
    short: "Launch failures, token burns, and a launchpad built to pay artists.",
    lede:
      "Recordings whose show notes cover token launches and tokenomics: what goes wrong in typical launches, token burns, and the Suede launchpad, which the notes describe as tax tokens that pay creators in SOL/USDC rather than in the artist's own token.",
    match: /launchpad|\blaunch(?:es)?\b|tokenomics|token burn|tax tokens|\brugs?\b/i,
    keywords: ["tokenomics", "token burn", "crypto launches", "Solana"],
  },
  {
    slug: "ai-and-the-music-industry",
    name: "AI and the music industry",
    title: "AI and the Music Industry: Episodes | AI Suede Podcast",
    description: (n) =>
      `${n} AI Suede Podcast recordings on AI in music: AI as a creator-side tool, paying the original artist when AI uses their work, and AI agents.`,
    short: "AI as a creator-side tool, paying artists when AI uses their work, AI agents.",
    lede:
      "Recordings whose show notes cover AI in music: AI as a creator-side tool rather than a replacement, paying the original creator when AI uses their work, and AI agents.",
    match:
      /\bAI (?:tools?|tooling)\b|\bAI use of\b|creator-side tool|\bAI-(?:driven|generated|powered)\b|\bAI music\b|\bAI agents?\b/i,
    keywords: ["AI and music industry", "AI tools for musicians", "AI agents", "AI creativity"],
  },
];

export const topicPath = (slug) => `/topics/${slug}`;

/** Static and index pages, keyed by public path. */
export const PAGE_KEYWORDS = {
  ...Object.fromEntries(TOPIC_HUBS.map((t) => [topicPath(t.slug), t.keywords])),
  "/ai-instructions": ["AI instructions", "official sources", "citation guidance"],
  "/": [
    "AI podcast for musicians",
    "AI music podcast",
    "music IP",
    "programmable media",
    "AI and music industry",
    "crypto AI podcast",
    "solo founder podcast",
  ],
  "/about": [
    "about the AI Suede Podcast",
    "podcast host",
    "music IP",
    "programmable media",
    "solo founder",
  ],
  "/contact": [
    "contact AI Suede Podcast",
    "podcast booking",
    "podcast guest request",
  ],
  "/appearances": [
    "Jason Colapietro podcast appearances",
    "guest appearances",
    "AMA recordings",
    "X Spaces",
    "crypto AI interviews",
    "AI music interviews",
  ],
};

/** Base term every episode page carries after its topic terms. */
export const EPISODE_BASE = ["AI music podcast episode"];

/**
 * Topic rules: when an episode's title or summary matches, its terms are added.
 * Matching on the episode's own words keeps each page's list true to that page.
 */
const TOPIC_RULES = [
  [/\bmusic ip\b|\bip stack\b|own your ip|\bip\b/i, ["music IP", "music IP registry blockchain"]],
  [/royalt/i, ["on-chain royalties", "music royalties"]],
  [/\brwas?\b|real[- ]world asset/i, ["music RWA", "real-world assets"]],
  [/\bx402\b/i, ["x402 agent payments"]],
  [/\bagents?\b/i, ["AI agents"]],
  [/identity|likeness/i, ["artist identity", "AI likeness protection"]],
  [/rights|copyright/i, ["music rights", "music copyright"]],
  [/\bBase\b/, ["Base blockchain"]],
  [/avalanche|\bavax\b|subnet/i, ["Avalanche", "Avalanche subnet"]],
  [/chainlink/i, ["Chainlink"]],
  [/solana|\bsol\b/i, ["Solana"]],
  [/binance/i, ["Binance AMA"]],
  [/mario nawfal/i, ["Mario Nawfal", "Mario Nawfal show"]],
  [/coinmerge/i, ["CoinMerge"]],
  [/btse/i, ["BTSE"]],
  [/digifinex/i, ["DigiFinex"]],
  [/apex exchange/i, ["Apex Exchange"]],
  [/crypto shogun/i, ["Crypto Shogun"]],
  [/metaguardians/i, ["MetaGuardians"]],
  [/fity\.?eth/i, ["Fity.eth"]],
  [/\bama\b/i, ["crypto AMA"]],
  [/x spaces|\bspace\b/i, ["X Spaces"]],
  [/web3/i, ["web3 music"]],
  [/crypto/i, ["crypto AI", "music crypto"]],
  [/token|burn|tokenomics/i, ["tokenomics", "token burn"]],
  [/launch/i, ["crypto launches"]],
  [/distribution/i, ["crypto music distribution"]],
  [/musician|artist/i, ["AI tools for musicians"]],
  [/trust/i, ["trust in AI"]],
  [/feedback loop|creativity/i, ["AI creativity"]],
  [/culture|meme/i, ["AI and culture"]],
  [/interview/i, ["founder interview"]],
  [/build update|weekly build/i, ["build update", "solo founder"]],
  [/welcome|new member/i, ["AI music community", "community welcome"]],
  [/dubai/i, ["Dubai", "crypto AI conversation"]],
];

/** Keyword list for one parsed episode ({ title, metaDescription }). */
export const episodeKeywords = (e) => {
  const text = `${e.title || ""} ${e.metaDescription || ""}`;
  const topics = TOPIC_RULES.flatMap(([re, terms]) => (re.test(text) ? terms : []));
  return withBrand([...topics, ...EPISODE_BASE]);
};
