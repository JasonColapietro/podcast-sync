/**
 * Suede AI products that episodes discuss, and the live site for each.
 *
 * An episode page (and a topic hub) links a product only when a line of the
 * show notes names it (`match`, tested against the notes in topics.mjs). The
 * link goes to the product's own canonical site, never to a demo or a gated
 * host: ip.suedeai.ai is a noindex demo (the registry is registry.suedeai.ai),
 * producer.suedeai.ai answers 401, and webmcp.suedeai.ai is not a product
 * page. test/topics.test.mjs refuses all three.
 *
 * `title` is the site's live <title> (`name` is its product part, used as the
 * link text) and `description` is its live meta description, verbatim, as
 * fetched on 2026-10-11: each answered HTTP 200, with `index, follow` robots
 * meta, no X-Robots-Tag header, and a canonical equal to `href`. Re-read the
 * live page before changing one, and keep prices and counts out, since they
 * live on the target site and drift.
 */
export const PRODUCTS = [
  {
    key: "registry",
    name: "Suede AI IP Registry",
    title: "Suede AI IP Registry · The ID and trust layer for music",
    href: "https://registry.suedeai.ai",
    description:
      "The ID and trust layer for music: one verifiable public ID per work, with a wallet-signed creator claim, contributors, timestamp, and derivative links on Base and Avalanche.",
    // "The on-chain registry", "The Suede Labs registry", "rights registry".
    match: /\bregistry\b/i,
  },
  {
    key: "social",
    name: "Suede Social",
    title: "Guitar Forum: Gear, Pedalboards & Tone | Suede Social",
    href: "https://social.suedeai.ai",
    description:
      "Ask guitar gear questions, discuss pedalboards and amps, troubleshoot your signal chain, and share your rig on the Suede Social guitar forum.",
    // "Suede Social — gear forums reborn with shareable rig DNA" (episode 33).
    match: /\bSuede Social\b/,
  },
];

export const productByKey = (key) => PRODUCTS.find((p) => p.key === key) ?? null;

/**
 * A show-notes line that claims a legal effect for the registry ("The Suede
 * Labs registry: court-enforceable proof of authorship on-chain", episodes 5
 * and 11; "55:00 The on-chain registry — court-enforceable proof of
 * authorship", episode 33). registry.suedeai.ai, fetched 2026-10-11, says the
 * opposite: "It is provenance evidence, not a copyright registration and not
 * proof of legal ownership." The episode page keeps the line where it was
 * published, in the notes under their publish date. Blocks built from the notes
 * that sit next to a product's live description (the product callout on an
 * episode page, the quotes on a topic hub) do not repeat it (topics.mjs).
 */
export const LEGAL_EFFECT_CLAIM = /court[- ]enforceable|legally (?:binding|enforceable)|proof of (?:legal )?ownership/i;
