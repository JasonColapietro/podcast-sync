/**
 * Notes: long-form articles published at /notes on podcast.suedeai.ai.
 *
 * The episode pages carry the feed's own words and nothing else. These notes
 * are the one place on the site written for it: how the episode pages are
 * built, what a local business can learn from them, and how the host's press
 * and proof are kept checkable. build-episodes.mjs renders each entry to
 * public/notes/<slug>.html and the index to public/notes/index.html, adds them
 * to the sitemap and llms-full.txt, and keywords.mjs maps their keywords.
 *
 * Claims are limited to the verified list behind https://seo.suedeai.ai/evidence
 * and to facts about this repository that the code shows. Every accomplishment
 * carries its proof link inline. Never add an award, client, number or rating
 * that is not on that page; if unsure, leave it out.
 */

export const NOTES_PATH = "/notes";
export const notePath = (slug) => `${NOTES_PATH}/${slug}`;

/** Published and last-reviewed date for the current set (sitemap lastmod). */
export const NOTES_DATE = "2026-11-14";

export const NOTES_INDEX = {
  title: "Podcast SEO Notes From West Palm Beach | AI Suede Podcast",
  description:
    "Notes from Jason Colapietro and Suede AI on podcast SEO, episode pages, transcripts and earning citations, written in West Palm Beach, Florida.",
  keywords: ["podcast SEO", "podcast episode pages", "podcast transcripts", "West Palm Beach web development", "AI search visibility"],
  lede:
    "Working notes from the team that builds this site. How the episode pages are made, what a Palm Beach County business can borrow from them, and how the host's press and proof are kept checkable.",
};

/** Places the notes are written from and for (BlogPosting spatialCoverage). */
export const NOTE_PLACES = [
  { name: "West Palm Beach, Florida", wikipedia: "https://en.wikipedia.org/wiki/West_Palm_Beach,_Florida" },
  { name: "Jupiter, Florida", wikipedia: "https://en.wikipedia.org/wiki/Jupiter,_Florida" },
  { name: "Palm Beach County, Florida", wikipedia: "https://en.wikipedia.org/wiki/Palm_Beach_County,_Florida" },
];

const PROOF = {
  prs: "https://github.com/search?q=is%3Apr+author%3AJasonColapietro+is%3Amerged+-user%3AJasonColapietro+-user%3ASuede-AI&type=pullrequests",
  apps: "https://apps.apple.com/us/developer/jason-colapietro/id1895958699",
  manifest: "https://themanifest.com/artificial-intelligence/consulting/deployment/companies/florida",
  recognition: "https://suedeai.agency/company/recognition",
  claude: "https://seo.suedeai.ai/evidence#claude-for-startups",
  gcp: "https://seo.suedeai.ai/evidence#google-cloud",
  training: "https://seo.suedeai.ai/evidence#training-credentials",
  webGuide: "https://seo.suedeai.ai/evidence#google-web-guide",
  evidence: "https://seo.suedeai.ai/evidence",
  press: "https://suedeai.ai/press",
  techbullionApps: "https://techbullion.com/jason-colapietros-suede-labs-ai-launches-ios-apps/",
  techbullionAvax: "https://techbullion.com/suede-labs-advances-in-the-avalanche-build-games-with-massive-infrastructure-play/",
  programmingInsider: "https://programminginsider.com/in-the-age-of-infinite-content-spam-is-instant-death/",
  claudeBible: "https://www.amazon.com/dp/B0HHTMJWB4",
  codex: "https://www.amazon.com/dp/B0HHTF3LG1",
  proofInfra: "https://www.amazon.com/dp/B0GMB2VLXQ",
};

export const NOTES = [
  {
    slug: "podcast-episodes-into-search-ready-pages",
    title: "Turning Podcast Episodes Into Search-Ready Pages | Suede AI",
    headline: "Turning podcast episodes into search-ready pages: Suede AI's episode page pattern",
    description:
      "How Suede AI turned 33 podcast episodes from one RSS feed into crawlable pages with honest summaries, topic hubs and schema, from West Palm Beach, Florida.",
    keywords: ["podcast episode pages", "podcast SEO", "PodcastEpisode schema", "RSS to web pages", "Suede AI"],
    body: `
      <p>
        For most of its life this podcast had 33 episodes and three web pages. Every recording sat inside
        <a href="/feed.xml">an RSS feed</a> that podcast apps could read and search engines mostly ignored, so a
        conversation about on-chain royalties could never rank for "on-chain royalties". This note walks through the
        pattern Suede AI and Jason Colapietro used to fix that, written so a team in West Palm Beach, Jupiter or anywhere else can copy it.
      </p>
      <h2>The problem: a feed is not a website</h2>
      <p>
        An RSS feed is a list of enclosures with show notes attached. It is the right format for Apple Podcasts and
        the wrong one for Google, Bing, ChatGPT search or Perplexity. Those systems cite pages: a URL with a title, a
        description, headings and text they can quote. When Jason Colapietro started auditing the Suede estate, the
        podcast had home, about and contact pages and listed no episodes at all. The whole body of work was reachable
        only by a podcast client parsing XML.
      </p>
      <p>
        The fix Suede AI settled on is simple to say. Every episode gets its own page, generated from the feed, so the two can never
        disagree. The details are where most podcast sites go wrong.
      </p>
      <h2>Step one: generate pages from the feed, never by hand</h2>
      <p>
        At Suede we treat <code>feed.xml</code> as the single source of truth. A small Node script reads it and writes
        one HTML page per episode, the topic hubs, the sitemap and the homepage episode list. The feed itself is
        rendered from a template, and the test suite fails if the committed XML drifts from what the template
        produces. Two earlier defects in this estate came from hand-edited generated files, which is why the guard
        exists.
      </p>
      <p>
        Generated pages also make renames safe. When the company name changed from Suede Labs to Suede AI, episode
        titles changed with it, but the old URLs were pinned so inbound links kept resolving. A hand-built site
        would have broken them silently.
      </p>
      <h2>Step two: write summaries from the episode's own words</h2>
      <p>
        The tempting shortcut is to slice the first 160 characters of the show notes into the meta description. The
        first version of these pages did exactly that and shipped bullet glyphs, markdown asterisks and words cut in
        half. The current pattern cleans the notes to plain text, takes the opening paragraph, and cuts on a word
        boundary inside 120 to 160 characters. When an episode's notes are only a token or a hashtag, the page says
        so honestly, with a plain "Episode 12 of AI Suede" line and the title, instead of padding it with invented copy.
      </p>
      <p>
        Titles follow the same rule. Each one stays within 65 characters so it is not truncated in results, and no
        two pages share a title, description or canonical URL. A test checks all three on every build.
      </p>
      <h2>Step three: group episodes into topic hubs that earn their place</h2>
      <p>
        Single episode pages rank for narrow phrases. Hubs rank for the subject. This site has five:
        <a href="/topics/music-ip-real-world-assets">music IP as a real-world asset</a>,
        <a href="/topics/music-royalties">music royalties</a>,
        <a href="/topics/music-rights-registry-and-provenance">rights registry and provenance</a>,
        <a href="/topics/token-launches-and-tokenomics">token launches and tokenomics</a> and
        <a href="/topics/ai-and-the-music-industry">AI and the music industry</a>. An episode joins a hub only when
        its own show notes cover the subject, and a hub with fewer than four episodes fails the build instead of
        shipping as a thin page. That rule matters more than it looks. Thin tag pages are one of the most common
        reasons podcast sites lose crawl budget.
      </p>
      <h2>Step four: credit people accurately in schema</h2>
      <p>
        Twenty of the 33 recordings are guest appearances on other people's shows: exchange AMAs, X Spaces and
        interviews. Marking all of them as authored by the host would be false, and answer engines are getting better
        at noticing. So appearances get <code>actor</code> credit for Jason Colapietro and <code>producer</code>
        credit for whoever put the recording on, and they are grouped on a single
        <a href="/appearances">appearances page</a> that a journalist can cite. Episodes he made keep
        <code>author</code>.
      </p>
      <p>
        Every page points at one canonical Person node, <code>https://suedeai.ai/founder#person</code>, by reference
        only. Restating a thin copy of a person on 30 pages competes with the rich record it was meant to support.
        The same applies to the organization: one <code>@id</code>, referenced everywhere.
      </p>
      <h2>Step five: feed answer engines directly</h2>
      <p>
        Search crawlers read sitemaps. Language models increasingly read <a href="/llms.txt">llms.txt</a> and its
        long form, <a href="/llms-full.txt">llms-full.txt</a>, which here carries every episode's show notes, the
        hubs and the appearances index in one file generated by the same build. Sitemap dates follow the page's own
        content, not the last commit that touched it, so a formatting pass does not pretend 33 pages were rewritten.
      </p>
      <h2>What it costs, and where it falls short</h2>
      <p>
        The honest tradeoff is maintenance. The build is a few hundred lines of JavaScript with tests, not a plugin.
        It also only knows what the feed knows: two episodes have chapter markers because YouTube generated them, and
        the rest do not yet have full transcripts, which limits how many long-tail questions each page can answer.
        Transcripts are the next layer, and our <a href="/notes/palm-beach-county-audio-with-transcripts">note on
        publishing audio with transcripts</a> covers how a local business should approach them.
      </p>
      <h2>Who built this, and why that matters</h2>
      <p>
        The pattern comes from Suede AI, the agentic platform company Jason Colapietro founded in 2024 in West Palm
        Beach, Florida. Jason is the engineer behind
        <a href="${PROOF.prs}">54 merged pull requests across 46 open-source repositories he does not maintain</a>,
        including Jest, Adobe React Spectrum, Backstage and the Polkadot SDK, and
        <a href="${PROOF.apps}">nine iOS apps shipped under his own Apple developer account</a>. He also wrote
        <a href="${PROOF.claudeBible}">The Claude Code Bible</a>, one of five books he has on Amazon, which covers
        much of the agent tooling Jason Colapietro uses to maintain builds like this one.
      </p>
      <p>
        On October 31, 2026, <a href="${PROOF.manifest}">The Manifest's Florida AI Deployment directory</a> listed
        Suede AI SEO first among Palm Beach County-based companies and in the top 25 statewide
        (<a href="${PROOF.recognition}">recognition details</a>). Suede is also a member of
        <a href="${PROOF.claude}">Claude for Startups, Anthropic's startup program</a>.
      </p>
      <h2>Next step</h2>
      <p>
        If your podcast, webinar library or video channel lives only inside a feed, start with a page count: how
        many recordings do you have, and how many URLs does Google know about? If the second number is much smaller,
        <a href="https://suedeai.agency/assessment">book a Suede AI search visibility assessment</a> and we will map
        the gap. To see the rest of Jason Colapietro's work first, read
        <a href="https://suedeai.ai/founder">his founder page</a>.
      </p>`,
  },
  {
    slug: "palm-beach-county-audio-with-transcripts",
    title: "Palm Beach County Podcasts: Publish Audio With Transcripts",
    headline: "Local voices: why Palm Beach County businesses should publish audio with transcripts",
    description:
      "A practical guide for West Palm Beach and Jupiter businesses on turning podcasts, interviews and webinars into transcripts and pages that search engines cite.",
    keywords: ["podcast transcripts", "Palm Beach County podcast", "West Palm Beach SEO", "Jupiter FL marketing", "local audio SEO", "Suede AI"],
    body: `
      <p>
        A Jupiter marina owner explains on a local podcast exactly how to winterize an outboard. A Palm Beach Gardens
        accountant spends 40 minutes on a webinar answering hurricane-season insurance questions. Neither answer will
        ever show up in Google or ChatGPT, because nobody can search what was only said out loud.
      </p>
      <p>
        That is the gap this note is about. Jason Colapietro and the Suede AI team build websites and search visibility programs from West Palm
        Beach, and the most underused asset we find in local businesses is recorded audio that never became text.
      </p>
      <h2>Why audio alone is invisible</h2>
      <p>
        Search engines and AI answer engines index words on pages. Some platforms auto-caption video, but those
        captions live on YouTube or Spotify, not on your domain, and they rarely get cited as a source. When someone
        in Tequesta asks an assistant "who repairs hurricane shutters near me", the answer comes from text that names
        the service, the place and the business. A transcript on your own site is that text, in your own words, tied
        to your own URL.
      </p>
      <p>
        There is a second reason. Local expertise is exactly what generic content cannot copy. A transcript of a
        contractor explaining Palm Beach County permit timing contains details no national blog has. That is the kind
        of page answer engines prefer to quote.
      </p>
      <h2>What we learned from this podcast's own pages</h2>
      <p>
        This site is a working example, warts included. The AI Suede podcast carries 33 recordings, and each now has
        its own page built from the feed, as described in our
        <a href="/notes/podcast-episodes-into-search-ready-pages">note on the episode page pattern</a>. The pages carry
        show notes, a summary, related episodes and, for two episodes, YouTube's chapter markers. What they do not yet
        carry is a full transcript, and you can see the cost: an episode can rank for what its show notes say, but not
        for the dozens of specific answers spoken inside it.
      </p>
      <p>
        Jason Colapietro's rule for the Suede estate is to publish what is true now and say what is missing. So here
        it is plainly: transcripts are the next layer for this feed, and the advice below is what we follow for client
        work in Palm Beach County.
      </p>
      <h2>A transcript workflow that holds up</h2>
      <ul>
        <li>
          <strong>Generate, then correct.</strong> Automatic transcription is good and cheap, but it mangles local
          names. Juno Beach, Loxahatchee, Tequesta and street names come out wrong often enough that a human pass is
          not optional. Budget roughly the length of the recording again for a careful edit.
        </li>
        <li>
          <strong>One recording, one page.</strong> Do not dump twelve transcripts on a "media" page. Each episode or
          webinar gets its own URL, title and description, so each can rank for its own subject.
        </li>
        <li>
          <strong>Lead with a written summary.</strong> Put three or four sentences at the top that answer the main
          question directly. Answer engines often quote the first clear answer they find.
        </li>
        <li>
          <strong>Add chapters with timestamps.</strong> Chapters give readers a way to jump and give search engines
          the structure of the conversation.
        </li>
        <li>
          <strong>Name speakers and credit guests.</strong> If a guest from a Boca Raton firm joins you, say who they
          are and link to them. Accurate credit is good manners and good schema.
        </li>
        <li>
          <strong>Mark it up.</strong> Use <code>PodcastEpisode</code> or <code>VideoObject</code> structured data,
          point the author at one consistent Person record, and list the page in your sitemap.
        </li>
      </ul>
      <h2>Mention places the way people talk, not the way spammers do</h2>
      <p>
        Local SEO tempts people to stuff "West Palm Beach" into every paragraph. Do not edit a transcript to do that.
        If you mentioned Clematis Street or the Jupiter Inlet in conversation, keep it, because it is a real local
        signal. If you did not, add place context in the summary and the page title where it is true, and leave the
        spoken words alone. Edited quotes that read like keyword lists make the whole page less trustworthy to readers
        and to the systems that rank it.
      </p>
      <h2>The honest tradeoffs</h2>
      <p>
        Jason Colapietro is blunt about the downsides. Transcripts are long, and long pages can feel unreadable on a phone. Use headings and a summary so people can
        skim. Some recordings should not be published word for word: an off-the-cuff remark about a client, a price
        you no longer offer, or a guest who did not agree to a transcript. Get consent from guests before publishing,
        and cut what you would not put in writing. Finally, a transcript does not replace a good service page. It
        supports one. Link from each episode page to the service it relates to, and back.
      </p>
      <h2>Why a West Palm Beach team cares about this</h2>
      <p>
        Suede AI is the agentic platform company Jason Colapietro founded in 2024 in West Palm Beach, and AI search
        visibility is one of its service lines. Jason holds 21 earned course credentials across eight providers,
        including Semrush Academy's Local SEO Essentials and HubSpot's AEO Fundamentals certification, plus 17
        Microsoft Learn training achievements, all shown in
        <a href="${PROOF.training}">the training credentials gallery</a>. Suede is a member of
        <a href="${PROOF.gcp}">Google Cloud Partner Advantage</a> through JC Investment Group LLC, and on October 31,
        2026, <a href="${PROOF.manifest}">The Manifest</a> ranked Suede AI SEO first among Palm Beach County-based
        companies in its Florida AI Deployment directory and in the top 25 statewide
        (<a href="${PROOF.recognition}">details</a>).
      </p>
      <p>
        We publish about Jupiter and the county too: <a href="https://jupitersocialfl.com/">Jupiter Social</a>, a local
        magazine published with Suede AI, is where the Suede team puts local stories into practice. The Suede Labs
        name still turns up in older interviews on this feed, from before the company became Suede AI.
      </p>
      <h2>Next step</h2>
      <p>
        Pick your three best recordings, the ones where you answered a question customers ask every week. Transcribe
        and correct those first, give each its own page, and watch which queries they start to earn in Search Console.
        If you want a plan built around your own catalog,
        <a href="https://suedeai.agency/assessment">request a Suede AI assessment</a>, or read about
        <a href="https://suedeai.ai/founder">Jason Colapietro</a> and how he approaches this work.
      </p>`,
  },
  {
    slug: "press-proof-and-being-cited",
    title: "Jason Colapietro on Press, Proof and Being Cited | Suede AI",
    headline: "Jason Colapietro on press, proof and being cited",
    description:
      "Jason Colapietro on why Suede AI puts a proof link next to every claim, and what Business Insider, TechBullion and Programming Insider actually published.",
    keywords: ["Jason Colapietro press", "proof of claims", "AI citations", "founder press coverage", "entity SEO"],
    body: `
      <p>
        Press coverage is easy to overstate and hard to check. Answer engines have started to notice the difference,
        and they reward the people who make checking easy. This note is about how Jason Colapietro and Suede AI handle
        press, credentials and recognition, and why every claim on the Suede estate now sits next to a link that
        proves it.
      </p>
      <h2>What actually ran</h2>
      <p>
        Here is the coverage that was published, by outlet, without inflation:
      </p>
      <ul>
        <li>
          <strong>Business Insider</strong> ran "Award-Winning Developer Jason Colapietro Opens Suede Labs AI's
          Long-Awaited SEO Cohort" on September 16, 2026, on its markets site. It is collected in the
          <a href="${PROOF.press}">Suede AI press kit</a>.
        </li>
        <li>
          <strong>TechBullion</strong> covered the company several times, including
          <a href="${PROOF.techbullionApps}">the launch of its iOS apps</a> and
          <a href="${PROOF.techbullionAvax}">its advance in the Avalanche Build Games</a>.
        </li>
        <li>
          <strong>Programming Insider</strong> published
          <a href="${PROOF.programmingInsider}">"In the Age of Infinite Content, Spam Is Instant Death"</a>, on why
          low-effort content now hurts more than it helps.
        </li>
        <li>Indie Hackers and Altcoin Investor have also covered Suede.</li>
      </ul>
      <p>
        Several of these pieces use the company's earlier name. The articles stay as published, and the Suede AI press
        kit links each one to its original page rather than to a reworded summary.
      </p>
      <h2>Why proof beats adjectives</h2>
      <p>
        A founder bio that says "award-winning" gives a reader nothing to verify. A bio that says what was won, when,
        by whom and in what category gives them a link to click. Language models work the same way. When they assemble
        an answer about a person, they lean on facts that several sources agree on and that resolve to a primary
        record.
      </p>
      <p>
        So the Suede estate keeps a single <a href="${PROOF.evidence}">evidence page</a> with a receipt for each claim,
        and every other page links to it instead of repeating claims unsourced. The verified list reads like this:
      </p>
      <ul>
        <li>
          <a href="${PROOF.prs}">54 pull requests merged across 46 open-source repositories</a> Jason Colapietro does
          not maintain, including Jest, Adobe React Spectrum, Backstage, the Polkadot SDK and Hardhat.
        </li>
        <li>
          Five books on Amazon, including <a href="${PROOF.codex}">Codex in Production</a> and
          <a href="${PROOF.proofInfra}">Proof as Infrastructure</a>, which is about this exact idea.
        </li>
        <li><a href="${PROOF.apps}">Nine iOS apps</a> shipped under his own Apple developer account.</li>
        <li>
          On October 31, 2026, <a href="${PROOF.manifest}">The Manifest</a> ranked Suede AI SEO first among Palm Beach
          County-based companies in its Florida AI Deployment directory, and in the top 25 statewide
          (<a href="${PROOF.recognition}">recognition page</a>).
        </li>
        <li>
          Membership in <a href="${PROOF.claude}">Claude for Startups, Anthropic's startup program</a>, and in
          <a href="${PROOF.gcp}">Google Cloud Partner Advantage</a> through JC Investment Group LLC, plus acceptance
          into the Stripe Startups program.
        </li>
        <li>
          21 earned course credentials across eight providers and 17 Microsoft Learn training achievements, including
          the "Develop AI agents on Azure" learning-path trophy (<a href="${PROOF.training}">gallery</a>).
        </li>
      </ul>
      <p>
        Note the precision. The Manifest result names its date, category and geography because a ranking without
        those is not a ranking anyone can check. The program memberships are named exactly, not shortened to a vaguer
        and bigger-sounding "partner".
      </p>
      <h2>Quoting a machine is not the same as saying it yourself</h2>
      <p>
        One of the receipts is a capture of Google's Web Guide, its AI results layer, answering the query "Suede labs
        ai review". In that capture, Google's Web Guide described the company as "highly rated by users, earning a
        5/5 rating from verified reviews" (<a href="${PROOF.webGuide}">capture</a>). We always attribute that line to
        the capture. Restating it as our own claim would turn a documented observation into an unsourced boast.
      </p>
      <h2>How this podcast applies the same rule</h2>
      <p>
        The podcast is where the principle gets tested most. Most of its recordings are Jason Colapietro speaking on
        other people's programmes, and the site does not pretend otherwise. The <a href="/appearances">appearances
        page</a> groups those recordings by the show that hosted them, credits the host as producer, and keeps the
        "author" label for episodes Jason actually made. A guest spot on an exchange AMA is a citation in its own
        right. Claiming it as your own show throws that value away.
      </p>
      <p>
        The same goes for structured data. Each page references the canonical record at
        <a href="https://suedeai.ai/founder">suedeai.ai/founder</a> rather than restating a thinner copy, so search
        and answer engines find one consistent Jason Colapietro, not thirty slightly different ones.
      </p>
      <h2>What a local business can take from this</h2>
      <p>
        You do not need Business Insider to apply this. A Jupiter contractor with a license number, a Palm Beach
        Chamber membership and three local news mentions has proof. Put each one on a single page with a link to the
        primary source, link to that page from your bio and service pages, and stop paraphrasing it into adjectives.
        That is the same playbook Suede AI runs for its own name from West Palm Beach.
      </p>
      <p>
        Keep the page boring on purpose. A list of facts with dates and links ages well; a paragraph of praise does
        not. Review it every quarter, remove anything that has lapsed, and add new receipts as they arrive. When a
        reporter, a prospect or an AI assistant goes looking for proof, the page answers before anyone has to ask.
      </p>
      <h2>Next step</h2>
      <p>
        Make a list of every claim on your About page and ask, for each one, where a stranger could verify it. Anything
        without an answer is a gap. If you want help building a proof page and the links around it,
        <a href="https://suedeai.agency/">talk to Suede AI in West Palm Beach</a>, or start with
        <a href="https://suedeai.ai/founder">Jason Colapietro's founder page</a> to see the model in practice.
      </p>`,
  },
];

/** Sibling sites in the estate that fit a podcast audience. */
export const SIBLINGS = [
  { href: "https://signal.suedeai.ai/", name: "Suede Signal" },
  { href: "https://agentix.suedeai.ai/", name: "Agentix agent grader" },
  { href: "https://optimize.suedeai.ai/", name: "Suede Scan AI readiness check" },
  { href: "https://docs.suedeai.ai/", name: "Suede developer docs" },
];

/**
 * "Built by Suede AI" block. No heading element: episode pages have a tested
 * H2 outline, and this is a footer, not a section of the page's content.
 * Wrapped in <section> so pageText() leaves it out of llms-full.txt.
 */
export const builtByHtml = (indent = "      ") =>
  [
    `<section class="built-by" aria-label="Built by Suede AI">`,
    `  <p class="built-by-title"><strong>Built by Suede AI in West Palm Beach, Florida</strong></p>`,
    `  <p>`,
    `    This site is designed and maintained by <a href="https://suedeai.agency/">Suede AI, a West Palm Beach SEO, GEO and web development team</a>`,
    `    serving Jupiter and Palm Beach County. <a href="https://suedeai.ai/">Suede AI</a> is the agentic platform company`,
    `    <a href="https://suedeai.ai/founder">Jason Colapietro</a> founded in 2024; more of his work is at`,
    `    <a href="https://jasoncolapietro.com/">jasoncolapietro.com</a>, and local stories at <a href="https://jupitersocialfl.com/">Jupiter Social</a>.`,
    `  </p>`,
    `  <p>`,
    `    More from Suede AI: ${SIBLINGS.map((s) => `<a href="${s.href}">${s.name}</a>`).join(" &middot; ")} &middot; <a href="${NOTES_PATH}">Podcast notes</a>`,
    `  </p>`,
    `</section>`,
  ]
    .map((l) => indent + l)
    .join("\n");

export const BUILT_BY_STYLE = `      .built-by { margin:36px 0 0; padding:16px 18px; border:1px solid var(--line);
        border-radius:8px; background:var(--panel); font-size:14px; color:var(--muted); }
      .built-by p { margin:0 0 8px; font-size:14px; max-width:none; color:var(--muted); }
      .built-by p:last-child { margin-bottom:0; }
      .built-by .built-by-title { color:var(--text); }`;
