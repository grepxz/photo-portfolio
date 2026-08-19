# SEO Foundation — Phase 1 Design

**Date:** 2026-08-19
**Site:** cedar4st.com (Astro 5, static, deployed to GitHub Pages)
**Status:** Approved, ready for implementation planning

## Context

Cedar4st is Hanna's photography portfolio. The goal is organic search traffic
only — no paid advertising — from people searching for a photographer in
Barcelona.

The site has no SEO layer of any kind. Every page emits the same
`<title>Hanna</title>` with no meta description, no canonical URL, no sitemap,
no structured data, and no robots.txt. The homepage contains neither the word
"photographer" nor "Barcelona" in any crawlable text.

Work is split into two phases. Phase 1, specified here, is the technical
foundation and depends on nothing from the site owner except three account
setups. Phase 2 is the service-page content, which is paced by the owner's
editing cycles. They are separated so that indexing can begin while copy is
still being written.

## Goals

1. Every page emits a unique, accurate title, description, and canonical URL.
2. Google and Bing can discover, crawl, and correctly interpret every page.
3. The homepage states what the business is and where it operates.
4. Search engines understand the business as a Barcelona service-area
   photographer.
5. Spanish can be added later as content work, not as a URL migration.
6. Regressions in the above are caught by tests.

## Non-goals for Phase 1

- Service pages for individual shoot types.
- The TFP / model-call page.
- Any Spanish content.
- Renaming the 242 gallery image files.
- Google Business Profile setup (owner's task; checklist provided).
- Refactoring `ParallaxWall` beyond measured, targeted fixes.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Languages | English + Spanish | Barcelona traffic splits across both; Spanish is the larger local-client pool. |
| Language rollout | Structure now, content later | Retrofitting i18n after indexing forces a URL migration, which costs rankings. |
| Service page scope | Only categories with real galleries | Pages without photographs are thin doorway pages and damage domain quality. |
| Absent categories | Named in copy under a TFP / reduced-rate offer | Earns the keyword mentions legitimately and doubles as model recruitment. |
| Landscape and night work | Editorial content, not service pages | Low commercial intent; builds topical authority without diluting service pages. |
| Local business type | Service-area, no published address | Owner works without a client-visitable studio. |
| Analytics | Cloudflare Web Analytics (cookieless) | No GDPR consent banner, no cookies, negligible page weight. Analytics does not affect ranking. |
| GTM / GA4 | Not installed | Would require a consent banner in Spain, costing visitors before they see any work. |
| Copy authorship | Claude drafts English, owner edits; Spanish after English is final | Owner supplies specifics only she knows; Spanish gets a native proofread before publishing. |
| AI training crawlers | Blocked in robots.txt | The images are the product. Blocking `Google-Extended` does not affect Google Search or Google Images. |
| Collection URL slugs | Slugified in Phase 1, before indexing | Current URLs contain spaces and capitals. Changing them post-indexing needs redirects, which GitHub Pages cannot serve cleanly. |

### Correction to the original plan

The original plan was to index the site "through Google Tag Manager." GTM does
not index anything; it is a container for loading analytics and marketing
scripts. Indexing on Google is handled by **Google Search Console**, which is
the counterpart to Bing Webmaster Tools. This design uses Search Console and
Bing Webmaster as the indexing path, and drops GTM entirely per the analytics
decision above.

## Architecture

### New module: `src/seo/`

Three files, all pure functions with no Astro imports, so they unit-test
directly under the existing vitest setup.

**`defaults.ts`** — site-wide constants: brand name, positioning string, default
Open Graph image, locale list, social profile URLs.

**`meta.ts`** — exports `buildMeta({ title, description, path, image, locale })`
returning the resolved title, canonical URL, and the Open Graph and Twitter tag
set. One function, one responsibility, no I/O.

**`schema.ts`** — JSON-LD builders returning plain objects:

- `professionalService()` — the business, `areaServed: Barcelona`, no address,
  `sameAs` linking Instagram, service catalogue.
- `person()` — Hanna, linked to the business.
- `breadcrumbList(segments)` — for the nested collection pages.

### `src/layouts/MainLayout.astro`

Gains a typed `Props` interface: `title`, `description`, `image?`.

Calls `buildMeta`, derives the canonical from `Astro.url` and the `site` value
already configured in `astro.config.mts`, and emits description, canonical,
Open Graph, Twitter card, and JSON-LD tags. The hardcoded `<title>{owner}</title>`
is removed.

Two fixes on the same critical path:

- The duplicate Google Fonts stylesheet. `MainLayout.astro:17` and
  `NavBar.astro:12` both fetch Dancing Script — two render-blocking requests for
  one font. The `NavBar.astro` copy is removed; `MainLayout.astro` keeps one.
- Alpine.js currently loads from unpkg with no integrity hash. Add `alpinejs` as
  a project dependency and import it through a bundled script, removing the
  third-party DNS lookup from every page load.

### Per-page metadata

- `index.astro` and `book.astro` — hand-written titles and descriptions.
- `collections/[...collection].astro` — derived from the collection, so each of
  the 15 collection routes gets its own title and description. The build
  currently emits 17 HTML pages, all sharing the title "Hanna".

Titles stay under roughly 60 characters to avoid truncation in results.

### URL slugs

Collection URLs are currently built directly from directory names, which contain
spaces and capital letters:

```
/collections/events/networking/Venture capital party/
/collections/activism/Barcelona Pride/
```

These are served percent-encoded. Mixed-case, space-encoded URLs render poorly
in search results, break when pasted into messaging apps, and split link equity
when some inbound links encode and others do not.

Collection routes are slugified to lowercase hyphenated form:

```
/collections/events/networking/venture-capital-party/
/collections/activism/barcelona-pride/
```

The slug mapping lives in the collections page alongside the existing tree
builder; directory names and `gallery.yaml` ids are left untouched, so no image
paths change.

**This is deliberately in Phase 1 rather than deferred.** Changing URLs after
indexing requires redirects and costs rankings; GitHub Pages cannot serve 301
redirects without workarounds. The site is not yet indexed, so the change is
free now and expensive later. It must land before the sitemap is submitted.

### i18n

Configure Astro 5's built-in i18n in `astro.config.mts`:

```js
i18n: {
  locales: ['en', 'es'],
  defaultLocale: 'en',
  routing: { prefixDefaultLocale: false },
}
```

English remains at `/`; Spanish will land at `/es/`.

**hreflang rule:** tags are emitted only for locales that actually have the page
in question. `hreflang` pointing at a URL that 404s is worse than emitting none —
Google reads it as a broken-site signal. Phase 1 therefore ships with hreflang
dormant; it activates per page as Spanish versions appear.

### Crawl infrastructure

- Install and configure `@astrojs/sitemap`. It generates from the static route
  list, covering all collection pages.
- `public/robots.txt` — allows all search crawlers, blocks AI training crawlers
  (`GPTBot`, `CCBot`, `Google-Extended`, `ClaudeBot`), and points to the sitemap.
- Verification files for Search Console and Bing Webmaster go in `public/`.
  GitHub Pages serves static files, so HTML-file verification is the simplest
  route. Verify Google first, then import the property into Bing.

### Homepage content signals

The current `<h1>` is `"good photo"` (`LandingHero-1.astro:14`), part of a
dictionary-entry design card. The parallax wall renders into a WebGL canvas, so
its 29 images are invisible to crawlers. Total crawlable homepage text is the
joke definition plus two button labels.

The card stays visually identical. Changes:

- Add one line beneath it: *"Hanna — documentary, event and wedding photographer
  in Barcelona."* This becomes the `<h1>`.
- `"good photo"` remains as styled text within the card, demoted from `<h1>`.
- Replace the filler subtitle in `FeaturedGallery.astro:10`, currently *"I think
  you might be interested in this"*, with *"Selected work from weddings, events
  and documentary shoots across Barcelona."* Deliberately worded differently from
  the `<h1>` — an identical sentence repeated on one page wastes the second slot.
- Add a short intro section below the fold: two or three paragraphs naming the
  service categories that have galleries behind them (weddings, events,
  documentary) and the areas served, plus internal links to the corresponding
  collection pages. Roughly 120–200 words — enough to give the homepage real
  subject matter without pre-empting Phase 2. Claude drafts, owner edits.
  Phase 2 expands this into the full copy and the TFP offer.

### Image alt text

242 images currently carry auto-generated titles (`"Img 7348"`, `"Pride 051"`)
and zero descriptions. `PhotoGrid.astro` uses `image.title` as the `alt`.

Three tiers:

1. Add an optional `alt` field to the `Meta` interface in `galleryData.ts`.
   Optional, so existing entries keep working. Resolved in `imageStore.ts` as
   `meta.alt ?? derived`.
2. The derived fallback composes a descriptive string from the collection rather
   than the filename, in the form `"<Collection name> — photography by Hanna,
   Barcelona"`, e.g. `"Barcelona Pride — photography by Hanna, Barcelona"`.
   Duplicate alt text within a collection is a weak signal, not a penalty — this
   is a floor, not the target.
3. The 29 `featured` images get hand-written alt text in Phase 1. They appear on
   the homepage and carry the most weight, and 29 is a tractable number. Claude
   drafts from the photographs; the owner corrects misreadings.

`gallery-generator.ts` is updated so future imports emit better defaults than
`Img 7348`.

### Performance

- Delete `public/hero-bg.webm`. It is 10.4 MB, and nothing in `src/` references
  it — it is a leftover from the hero replaced in commit `0c013ef`.
- Measure `ParallaxWall` before changing it. three.js is real weight on Largest
  Contentful Paint, but the effect is the site's visual identity and will not be
  refactored on speculation. Permitted targeted fixes: defer WebGL
  initialisation until after first paint, and honor `prefers-reduced-motion`.
- Note: `dist/` is 153 MB. Within GitHub Pages limits, but deploys will be slow.

### Analytics

A single Cloudflare Web Analytics beacon in `MainLayout.astro`. No cookies, no
consent banner, no measurable page-weight cost. Requires a site token from the
owner.

## Testing

- Unit tests for `buildMeta` — title composition, truncation, canonical
  derivation, Open Graph output.
- Unit tests for each `schema.ts` builder — valid JSON-LD shape, no address
  emitted for the service-area business, correct breadcrumb nesting.
- Unit tests for alt-text resolution — explicit `alt` wins, fallback is
  descriptive, no `"Img NNNN"` ever reaches output.
- Unit tests for slugification — spaces become hyphens, output is lowercase,
  nesting is preserved, and every collection id maps to a unique slug.
- A build-time regression test asserting **every generated page has a unique,
  non-empty title and description**. This is the exact failure mode the site is
  in today, and it is the kind that returns silently.

## Manual steps for the site owner

These cannot be done from the repository:

1. **Google Business Profile** — create as a service-area business covering
   Barcelona, with the street address hidden. A phone number is required for
   verification. This feeds the local map pack, which sits above organic results
   for "photographer in Barcelona" and is the single largest available lever.
   Business name, category, and service area must match the site's structured
   data exactly.
2. **Google Search Console** — create the property, place the verification file,
   submit the sitemap.
3. **Bing Webmaster Tools** — import the Search Console property.
4. **Cloudflare Web Analytics** — create the account, supply the site token.

## Phase 2 outline

Not specified here; gets its own design document once Phase 1 is live and
Search Console has accumulated query data.

- Service pages for categories with existing galleries: weddings, events
  (nightclub, networking, sport, birthday), documentary and journalistic (Pride,
  Mexico, Ukraine).
- A TFP / portfolio-building page naming the categories without galleries yet —
  portrait, proposal, romantic, studio, backstage, streetstyle, property and
  Airbnb, concert, creative — attached to a reduced-rate or TFP offer. Creative
  shoots are the priority category and the primary reason models are needed.
- Editorial content for landscape and night photography.
- Spanish translations, prioritised by which English pages actually gain
  traction.
