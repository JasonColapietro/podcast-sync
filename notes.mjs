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

/** Last-modified date for the current set (BlogPosting dateModified, sitemap lastmod). */
export const NOTES_MODIFIED = "2026-11-15";

/** Publish date of one note: its own datePublished, or the first set's date. */
export const notePublished = (n) => n.datePublished ?? NOTES_DATE;

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
  clutch: "https://clutch.co/profile/suede-ai-seo",
  clutchFlorida: "https://clutch.co/consulting/ai/florida",
  clutchUs: "https://clutch.co/us/consulting/ai",
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

/**
 * Articles on other Suede AI satellites that the round-four notes cite in-body.
 * Each URL was live in its site's sitemap on 2026-11-15; test/notes.test.mjs
 * requires at least two of them in every note dated after the first set.
 */
export const SATELLITE_ARTICLES = {
  citablePassages: "https://signal.suedeai.ai/articles/citable-passages",
  jsonLd: "https://signal.suedeai.ai/articles/json-ld-for-ai-visibility",
  quotableDocs: "https://docs.suedeai.ai/notes/ai-quotable-developer-docs",
  readinessScore: "https://optimize.suedeai.ai/notes/what-an-ai-readiness-score-measures",
};

/**
 * The Clutch ranking, verbatim. Kept apart from The Manifest result: the two are
 * different directories with different categories and dates, never one claim.
 */
const CLUTCH_CLAIM =
  `Suede AI ranks among <a href="${PROOF.clutch}">Clutch</a>'s <a href="${PROOF.clutchFlorida}">Top 30 AI Consultants in Florida</a>` +
  ` and <a href="${PROOF.clutchUs}">Top 50 AI Consultants nationwide</a> (November 2026).`;

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
        (<a href="${PROOF.recognition}">recognition details</a>). ${CLUTCH_CLAIM} Suede is also a member of
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
        (<a href="${PROOF.recognition}">details</a>). ${CLUTCH_CLAIM}
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
        Several of these pieces use Suede AI's earlier name. The articles stay as published, and the Suede AI press
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
        <li>${CLUTCH_CLAIM}</li>
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
        Suede AI keeps its own proof page boring on purpose, and yours should be too. A list of facts with dates and links ages well; a paragraph of praise does
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
  {
    slug: "chapters-transcripts-show-notes-checklist",
    datePublished: "2026-11-15",
    title: "Chapters, Transcripts and Show Notes: A Podcast Checklist",
    headline: "Chapters, transcripts and show notes: a production checklist for Delray Beach and Boynton Beach podcasters",
    description:
      "A pre-publish checklist from Suede AI for Delray Beach and Boynton Beach podcasters: show notes, chapter markers and transcripts that search engines can use.",
    keywords: ["podcast chapters", "podcast transcripts", "podcast show notes", "Delray Beach podcast", "Boynton Beach podcast", "Suede AI"],
    places: [
      { name: "Delray Beach, Florida", wikipedia: "https://en.wikipedia.org/wiki/Delray_Beach,_Florida" },
      { name: "Boynton Beach, Florida", wikipedia: "https://en.wikipedia.org/wiki/Boynton_Beach,_Florida" },
    ],
    body: `
      <p>
        A Delray Beach podcaster records a strong hour on how restaurants along Atlantic Avenue survive the summer
        slowdown, uploads it, pastes two lines into the description box and moves on. Three months later the episode
        has a few hundred plays and no search visibility at all, because the only text on the web about it is those
        two lines.
      </p>
      <p>
        This checklist is the production pass Jason Colapietro and Suede AI run before an episode goes live. It is
        written for the independent shows in Delray Beach and Boynton Beach, from chamber interviews to fishing
        reports out of the Boynton Inlet, but it works for any show that wants its recordings found and quoted.
      </p>
      <h2>Why show notes, chapters and transcripts are three different jobs</h2>
      <p>
        The three layers are often treated as one chore. They have three different readers. Show notes serve the
        person deciding whether to press play and the podcast app that displays them. Chapters serve the listener who
        wants minute 23, and the search engine that wants the shape of the conversation. The transcript serves
        everyone who will never press play: the skimmer, the reader who relies on text, and the answer engine looking
        for a sentence to quote.
      </p>
      <p>
        When one layer is missing, the others cannot cover for it. This site shows the gap plainly. Of the 33
        recordings in <a href="/feed.xml">the AI Suede feed</a>, one carries chapter markers in its own show notes and
        two carry markers YouTube generated automatically, labelled as such on the page. None has a full transcript
        yet, so every episode page can rank for what its notes say and nothing more.
      </p>
      <h2>Before you record</h2>
      <ul>
        <li>
          <strong>Write the one-sentence answer first.</strong> Decide which question the episode answers and write
          the answer in one sentence. It becomes the first line of the show notes and the top of the transcript page.
        </li>
        <li>
          <strong>Collect spellings.</strong> Guest names, business names and places. Automatic transcription is weak
          on local names: Boynton can come back as "Boyington", Lake Worth Beach loses a word, and a guest's surname
          turns into a common noun. A one-page spelling sheet saves an hour of editing.
        </li>
        <li>
          <strong>Get consent in writing.</strong> Ask every guest whether a full transcript can be published. Most
          say yes, and the ones who say no are far happier to be asked before than after.
        </li>
      </ul>
      <h2>Show notes checklist</h2>
      <ul>
        <li>Open with the answer sentence, not "In this episode we talk about".</li>
        <li>Name the guest, their role and their business, and link to them once.</li>
        <li>
          Keep the summary that doubles as a meta description between 120 and 160 characters, cut on a word boundary.
          The build Jason Colapietro wrote for this site enforces that range and fails when a page drifts outside it.
        </li>
        <li>
          Strip markdown asterisks and emoji bullets from anything a search engine will display. The first version of
          these episode pages shipped raw asterisks into descriptions; the fix was a cleaning step, not a rewrite.
        </li>
        <li>
          Mention places only where the conversation was about them. An episode on events at Old School Square should
          say Delray Beach. A general marketing episode should not pretend to be local.
        </li>
      </ul>
      <h2>Chapters checklist</h2>
      <ul>
        <li>
          Put timestamps in the description in one consistent format, starting at 00:00, so both YouTube and podcast
          apps can read them.
        </li>
        <li>Title each chapter as the question it answers, so the list reads like a table of contents someone could search.</li>
        <li>Aim for one chapter every five to ten minutes. Thirty chapters in an hour is noise.</li>
        <li>
          If you rely on automatic chapters, say so. The pages here read "YouTube generated these chapter markers",
          because a reader deserves to know nobody on the show chose those titles.
        </li>
        <li>Link each timestamp to that moment in the recording. Every chapter on this site opens the YouTube upload at that point.</li>
      </ul>
      <h2>Transcript checklist</h2>
      <ul>
        <li>Generate with a speech-to-text tool, then edit with the spelling sheet open. Budget roughly the running time again.</li>
        <li>Label speakers by name, never "Speaker 1".</li>
        <li>Break the text under the chapter titles as headings, so the transcript and the chapters share one outline.</li>
        <li>
          Put a three-sentence written summary above it. Suede Signal's guide to
          <a href="${SATELLITE_ARTICLES.citablePassages}">writing passages AI answer engines can quote</a> explains
          why the first clear answer on a page carries so much weight.
        </li>
        <li>Remove what you would not put in writing: an old price, an aside about a client, a guest's unguarded moment.</li>
      </ul>
      <h2>Publishing checklist</h2>
      <ul>
        <li>
          One episode, one URL, on your own domain. A transcript that lives only on a hosting platform builds that
          platform's authority, not yours.
        </li>
        <li>
          Add <code>PodcastEpisode</code> structured data, with the author pointing at a single Person record by
          <code>@id</code>. Suede Signal's piece on
          <a href="${SATELLITE_ARTICLES.jsonLd}">how JSON-LD helps AI engines understand your brand</a> covers the
          identity side in more depth.
        </li>
        <li>
          Credit guests accurately. On this site, recordings made on other people's shows credit their host as
          producer and Jason Colapietro as a participant, never as the author.
        </li>
        <li>Add the page to your sitemap and, if you publish one, to <a href="/llms.txt">llms.txt</a>.</li>
        <li>Link the episode to the service or topic page it supports, and link back.</li>
      </ul>
      <h2>What the pass costs a small show</h2>
      <p>
        Rough numbers from our own passes: a careful job on a 45-minute episode takes most of an afternoon the first
        few times, with about 45 minutes on transcript edits, 20 on chapters and 20 on notes and publishing. It drops
        quickly once the spelling sheet and templates exist. Weekly shows usually batch the work, or keep full
        transcripts for the episodes that answer questions people actually search. That is a fair tradeoff. A
        transcript of a rambling catch-up episode helps nobody, and at Suede we would rather see ten corrected
        transcripts than fifty raw ones.
      </p>
      <h2>Who wrote this checklist</h2>
      <p>
        Suede AI is the agentic platform company Jason Colapietro founded in 2024 in West Palm Beach, a short drive up
        I-95 from Boynton Beach, and AI search visibility is one of its service lines. Jason built the generator behind
        this podcast site, and his engineering record is public:
        <a href="${PROOF.prs}">54 pull requests merged across 46 open-source repositories he does not maintain</a>,
        including Jest and Backstage, and <a href="${PROOF.apps}">nine iOS apps</a> under his own Apple developer
        account. His training includes Semrush Academy's Local SEO Essentials and HubSpot's AEO Fundamentals
        certification among 21 earned course credentials (<a href="${PROOF.training}">gallery</a>).
      </p>
      <p>
        On October 31, 2026, <a href="${PROOF.manifest}">The Manifest</a> ranked Suede AI SEO first among Palm Beach
        County-based companies in its Florida AI Deployment directory and in the top 25 statewide
        (<a href="${PROOF.recognition}">recognition details</a>). Separately, ${CLUTCH_CLAIM} The Suede team keeps a
        receipt for each of these on <a href="${PROOF.evidence}">the evidence page</a>.
      </p>
      <h2>Next step</h2>
      <p>
        Run your next episode through this list before it goes live, then compare its Search Console impressions with
        your last three episodes after a month. If you want Suede AI to set up the templates and the build for your
        show, <a href="https://suedeai.agency/assessment">request an assessment from Suede AI in West Palm Beach</a>.
        To see more of Jason Colapietro's work, visit <a href="https://suedeai.ai/founder">his founder page</a> or
        <a href="https://jasoncolapietro.com/">jasoncolapietro.com</a>.
      </p>`,
  },
  {
    slug: "repurpose-one-episode-five-search-assets",
    datePublished: "2026-11-15",
    title: "Repurpose One Podcast Episode Into Five Search Assets",
    headline: "Repurposing one episode into five search-ready assets without duplicate content",
    description:
      "How Suede AI turns one podcast episode into five search-ready assets, each with its own job and words, so the copies never compete with the episode page.",
    keywords: ["podcast repurposing", "duplicate content", "canonical URL", "podcast clips", "podcast SEO", "Suede AI"],
    body: `
      <p>
        One hour of conversation can feed a website for a month, or it can be pasted into five places and compete with
        itself in every one of them. The difference is not how many assets you make from an episode. It is whether
        each one does a job the others cannot.
      </p>
      <p>
        This note is how Jason Colapietro and Suede AI repurpose a single recording into five search-ready assets
        without publishing the same text five times. It draws on how this podcast site is built, and it is written for
        creators and small businesses around Palm Beach County who record far more than they publish.
      </p>
      <h2>What duplicate content actually costs</h2>
      <p>
        Search engines rarely punish a site for repeating itself. What they do is pick one version of the repeated text
        to show and quietly set the others aside. If the version they pick is a social post or a hosting platform's
        page instead of your episode page, the links, clicks and citations go there. Answer engines behave much the
        same way: when five pages say the same thing, the one that gets quoted is the one that looks most like the
        original, and that is often not yours.
      </p>
      <p>
        So the rule at Suede is short. Every repurposed asset gets a different job, different words, and a link back
        to one canonical home.
      </p>
      <h2>Asset one: the episode page, the canonical home</h2>
      <p>
        The episode page holds the complete record: the show notes as written, chapters, the full corrected transcript
        when there is one, guest credits and structured data. On this site every episode page is generated from
        <a href="/feed.xml">the feed</a> and carries its own canonical URL, and a test fails the build if two pages
        share a title, description or canonical. Everything else points here.
      </p>
      <p>
        The feed repeats the show notes, and that is fine. Podcast apps read an RSS item; search engines rank web
        pages. The feed item and the episode page are one piece of content in two formats, not two pages competing.
      </p>
      <h2>Asset two: an article that answers one question in new words</h2>
      <p>
        Pick the single most useful answer in the episode and write it up as an article. Do not paste the transcript
        section. Rewrite it for a reader: the claim, the reasoning, a worked example and what to do next, with a link
        to the timestamp where it was said. When Jason Colapietro does this, a 40-minute conversation about royalty
        splits becomes one focused article on how a split sheet works. The article ranks for the question; the episode
        page ranks for the conversation.
      </p>
      <p>
        Suede AI's docs site applies the same thinking to reference pages in its note on
        <a href="${SATELLITE_ARTICLES.quotableDocs}">building docs that AI assistants quote correctly</a>: one source
        of truth, written so a quoted passage stands on its own.
      </p>
      <h2>Asset three: the video description and its chapters</h2>
      <p>
        The YouTube description is not a copy of the show notes. It is shorter, it leads with what the viewer will
        see, it carries the chapter timestamps, and it links to the episode page for the transcript. Two uploads on
        this channel had no chapters in their descriptions, so their episode pages show YouTube's automatic markers and
        say exactly where they came from. That label keeps the page honest about who wrote what.
      </p>
      <h2>Asset four: short clips with their own captions</h2>
      <p>
        A 45-second clip should answer one narrow question, with a caption written for the platform it lives on. Write
        one line that says what the clip answers and one that points to the episode page, rather than pasting the
        article's opening into every caption. Clips earn attention, not rankings. Their job is to send people to the
        canonical home, so their text can stay short.
      </p>
      <h2>Asset five: a hub entry that adds context</h2>
      <p>
        Topic hubs collect episodes on one subject. This site has five, including
        <a href="/topics/music-royalties">music royalties</a> and
        <a href="/topics/ai-and-the-music-industry">AI and the music industry</a>. A hub entry carries a short summary
        taken from the episode's own notes and a link, never the notes in full, and the hub adds what no single
        episode can: the whole list on one subject in one place. An episode joins a hub only when its own notes cover
        the subject, and a hub with fewer than four episodes fails the build rather than shipping as a thin page.
      </p>
      <h2>The one deliberate exception</h2>
      <p>
        One file on this site repeats nearly everything on purpose: <a href="/llms-full.txt">llms-full.txt</a>, a
        single Markdown file with every episode's show notes, the hubs and these notes, for language models that would
        rather read one file than thirty pages. Its sections name the URL they came from, so the copy points back to
        the canonical page instead of competing with it. It is a text file, not an HTML page, and the build Jason
        Colapietro maintains writes it, so it cannot drift from the pages it summarises.
      </p>
      <h2>A quick test before you publish</h2>
      <ul>
        <li>Could a reader tell from the first two sentences why this asset exists separately?</li>
        <li>Does it link to the canonical episode page?</li>
        <li>Is more than a paragraph identical to text on another URL you control? If so, cut it or rewrite it.</li>
        <li>Does each web page's canonical tag point at itself, and does only the episode page carry the full transcript?</li>
      </ul>
      <p>
        At Suede we automate the structural half of that test. Suede Audit's note on
        <a href="${SATELLITE_ARTICLES.readinessScore}">what an AI readiness score measures</a> explains which signals
        a checker reads and which ones still need a human eye.
      </p>
      <h2>Who is behind this</h2>
      <p>
        Suede AI (formerly Suede Labs) is the agentic platform company Jason Colapietro founded in 2024 in West Palm
        Beach, Florida, with AI search visibility as one of its service lines. Jason writes about the tooling behind
        builds like this one in <a href="${PROOF.claudeBible}">The Claude Code Bible</a>, and about keeping claims
        checkable in <a href="${PROOF.proofInfra}">Proof as Infrastructure</a>, two of his five books on Amazon.
        Suede is a member of <a href="${PROOF.claude}">Claude for Startups, Anthropic's startup program</a>, and of
        <a href="${PROOF.gcp}">Google Cloud Partner Advantage</a> through JC Investment Group LLC.
      </p>
      <p>
        ${CLUTCH_CLAIM} In a different directory, on October 31, 2026,
        <a href="${PROOF.manifest}">The Manifest</a> ranked Suede AI SEO first among Palm Beach County-based companies
        in its Florida AI Deployment directory and in the top 25 statewide (<a href="${PROOF.recognition}">details</a>).
      </p>
      <h2>Next step</h2>
      <p>
        Take your best episode from the last six months and list the five assets above. Write the single job each one
        does, and where two assets share a job, merge them. If you want Suede AI to map your catalog and build the
        canonical pages, <a href="https://suedeai.agency/">talk to Suede AI in West Palm Beach</a>, or start with
        <a href="https://suedeai.ai/founder">Jason Colapietro's founder page</a>. More of his writing is at
        <a href="https://jasoncolapietro.com/">jasoncolapietro.com</a>.
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
    `  <p>${CLUTCH_CLAIM}</p>`,
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
