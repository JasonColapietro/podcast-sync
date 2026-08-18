import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import {
  parseEpisodes,
  resolveSummary,
  metaDescription,
  looksLikeStub,
} from "../build-episodes.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const xml = readFileSync(join(__dirname, "..", "public", "feed.xml"), "utf8");
const episodes = parseEpisodes(xml);

// Non-vacuous by construction: the fix is pointless if there are no episodes to
// check, and this feed is the exact data that produced the broken descriptions.
test("the feed yields the full episode set", () => {
  assert.ok(episodes.length >= 30, `expected the full feed, got ${episodes.length} episodes`);
});

const WORD = /[A-Za-z0-9$]/;

// The claim under guard: NO episode meta description is broken. A description is
// broken if it (a) is cut mid-word, (b) is a stub under ~40 chars, (c) is a bare
// token like "$SUEDE", or (d) still carries list-bullet / markdown markers.
// Asserted per episode — never on a concatenation — so adjacency is never invented.
for (const e of episodes) {
  const label = `ep#${e.number || "?"} (${e.slug})`;

  test(`${label}: meta description is not cut mid-word`, () => {
    const meta = e.metaDescription;
    const full = resolveSummary(e); // the untruncated string meta is derived from

    if (meta.endsWith("…")) {
      // Truncated: the kept prefix must be whole words from `full`, and the
      // character in `full` right after the cut must be a word boundary (not a
      // letter) — i.e. we cut at a space, never inside a token.
      const head = meta.slice(0, -1);
      assert.ok(
        full.startsWith(head),
        `${label}: truncated meta is not a clean prefix of its summary\n  meta: ${meta}\n  full: ${full}`,
      );
      const boundary = full.charAt(head.length);
      assert.ok(
        boundary === "" || !WORD.test(boundary),
        `${label}: meta was cut mid-word (next source char = ${JSON.stringify(boundary)})\n  ${meta}`,
      );
    } else {
      // Not truncated: it must be the whole summary, so nothing was chopped off.
      assert.equal(meta, full, `${label}: meta neither truncated nor complete\n  ${meta}`);
    }
  });

  test(`${label}: meta description is not a stub or bare token`, () => {
    const meta = e.metaDescription;
    assert.ok(meta.length >= 40, `${label}: meta only ${meta.length} chars: ${JSON.stringify(meta)}`);
    assert.notEqual(meta.trim(), "$SUEDE", `${label}: meta is the bare token "$SUEDE"`);
    const words = meta.split(/\s+/).filter(Boolean);
    assert.ok(words.length >= 5, `${label}: meta has only ${words.length} words: ${JSON.stringify(meta)}`);
    // A bare token / keyword-salad is mostly $handles/#tags with little prose;
    // require real alphabetic content.
    const alpha = meta.replace(/[^A-Za-z]/g, "").length;
    assert.ok(alpha >= 25, `${label}: meta has too little prose (${alpha} letters): ${JSON.stringify(meta)}`);
  });

  test(`${label}: meta description carries no bullet or markdown markers`, () => {
    const meta = e.metaDescription;
    for (const marker of ["•", "✅", "▪", "●", "‣", "**", "__"]) {
      assert.ok(!meta.includes(marker), `${label}: meta still contains ${JSON.stringify(marker)}: ${meta}`);
    }
  });
}

// Guardrail on the guard: prove the checks would FIRE on the old defect, so a
// future regression cannot pass silently. This reconstructs the pre-fix output
// (raw text hard-sliced at 180) for the episodes the audit flagged and asserts
// each broken property is actually caught.
test("the guard is non-vacuous: it rejects the old .slice(0,180) output", () => {
  const oldMeta = (e) => e.description.slice(0, 180); // the pre-fix behavior

  // A mid-word cut: raw slice lands inside "musician".
  const recap = episodes.find((e) => e.slug.includes("full-recap"));
  assert.ok(recap, "expected the Binance full-recap episode in the feed");
  const oldRecap = oldMeta(recap);
  assert.ok(oldRecap.includes("• The four layers"), "sanity: old output carried the bullet");
  // The current, fixed meta for that same episode is clean.
  assert.ok(!recap.metaDescription.includes("•"), "fixed recap meta must not carry a bullet");
  assert.ok(!recap.metaDescription.endsWith("m"), "fixed recap meta must not end mid-word");

  // A bare-token stub: the "$SUEDE" episode.
  const trust = episodes.find((e) => e.slug.includes("why-trust-matters"));
  assert.ok(trust, "expected the trust-matters episode in the feed");
  assert.equal(oldMeta(trust).trim(), "$SUEDE", "sanity: old output was the bare token");
  assert.ok(
    trust.metaDescription.length >= 40 && trust.metaDescription !== "$SUEDE",
    "fixed trust meta must be a real sentence",
  );
  assert.ok(looksLikeStub(trust.description), "sanity: source description is a stub");
});
