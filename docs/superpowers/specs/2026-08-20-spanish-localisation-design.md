# Spanish Localisation — Design

Date: 2026-08-20
Status: Approved
Phase: SEO Phase 2 (first workstream)

## Context

Phase 1 shipped the i18n scaffolding and deliberately left it dormant:

- `src/seo/defaults.ts` — `LOCALES = ['en', 'es']`, `DEFAULT_LOCALE = 'en'`
- `astro.config.mts` — `i18n` configured with `routing: { prefixDefaultLocale: false }`
- `src/seo/hreflang.ts` — `alternates()` returns `[]` for a single locale, so no
  hreflang shipped while Spanish did not exist
- `src/seo/meta.ts` — `buildMeta()` already accepts a `locale` and threads it to
  `og.locale`

Nothing about the English site changes. Spanish is added alongside it.

## Goals

Ship all 17 pages in Spanish at `/es/…`, targeting Spanish-language search
intent for photography services in Barcelona, with hreflang, sitemap alternates
and a language switcher. Organic only, consistent with the Phase 1 strategy.

## Non-goals

Explicitly out of scope, recorded so they read as decisions rather than
oversights:

- **Image alt text stays English.** 29 hand-written alts across 524 image
  entries. Alt text is the least likely surface to drive Spanish queries, and
  translating it is easy to add later without rework.
- **Catalan.** Barcelona is Catalan-speaking and `ca` is a plausible third
  locale. The architecture below is locale-generic, so adding it later is a
  dictionary plus a route directory, not a redesign. Not now.
- **Translated URL slugs.** See Decision 4.

## Decisions

### 1. Scope — all 17 pages

14 collection nodes (11 from `gallery.yaml`, 3 from the `SYNTHETIC` array in
`src/pages/collections/[...collection].astro`) plus home, book, and the
collections index. Full coverage means hreflang is complete sitewide and no
Spanish visitor is ever dropped back into English mid-journey.

### 2. Copy — drafted here, reviewed by Hanna

Mirrors the English workflow. Nothing ships unreviewed. Stilted translated copy
is penalised by readers and search engines alike, and errors on the Book page
cost real enquiries.

### 3. Structure — shared components, thin locale pages

Rejected alternatives:

- **Duplicate page files.** Cheapest to stand up, but every future layout change
  is made twice, and the collections route carries real logic (slug map,
  synthetic nodes, unmapped-slug guard) that must not exist in two copies.
- **Single `[...locale]` dynamic route.** Elegant, but `prefixDefaultLocale:
  false` means English has no prefix, and combining an optional locale segment
  with the existing `[...collection]` rest parameter is where Astro routing
  turns subtle. The failure mode is silent 404s on pages that work today.

Chosen: page markup lives once in locale-aware components; `/es/` routes are
thin wrappers that select a locale. Complexity lives in typed data, not routing.

### 4. URL slugs stay English in both locales

`/es/collections/weddings/`, not `/es/colecciones/bodas/`. Translated slugs
would require a second slug map, a second collision guard, and non-obvious
hreflang pairing, for a marginal keyword gain. Decided before indexing, because
changing it afterwards costs redirects that GitHub Pages cannot serve cleanly —
the same reasoning that drove the Phase 1 slug work.

### 5. Grammatical gender — *fotógrafa* throughout

Spanish forces a choice English did not. The feminine form is used consistently
in prose, headings and meta. It concedes some volume against *fotógrafo*
queries, which Google largely bridges as morphological variants, and it competes
in a thinner field.

### 6. Hero card — rewritten natively, not translated

The homepage `<h1>` sits inside a dictionary-entry card whose joke depends on
English phrasing and whose IPA is the British pronunciation of *photo*. The
Spanish card gets its own headword, its own IPA, and a punchline written to land
in Spanish. Draft alternatives go to Hanna to choose from.

## Architecture

### New files

```
src/i18n/types.ts       Strings interface — the contract between locales
src/i18n/en.ts          English dictionary
src/i18n/es.ts          Spanish dictionary, typed as Strings
src/i18n/index.ts       useTranslations(locale), localePath(path, locale)
src/collections/route.ts        shared collection data + getStaticPaths helper
src/components/CollectionPage.astro     shared collection page body
src/components/LanguageSwitcher.astro
src/content/book.es.md
src/pages/es/index.astro
src/pages/es/book.astro
src/pages/es/collections/[...collection].astro
```

### Changed, behaviourally identical in English

`NavBar`, `LandingHero-1`, `HomeIntro`, `FeaturedGallery`, `FeaturedWorkScroll`
and `CalBooking` take a `locale` prop defaulting to `'en'` and read strings from
the dictionary. `Footer` needs no change: it renders only a copyright year and
the owner name, both from config.
`MainLayout` sets `lang` per locale and passes `availableLocales`.
`src/pages/collections/[...collection].astro` becomes a thin wrapper over the
extracted shared module.

### Type safety as the enforcement mechanism

`es.ts` is typed as `Strings`. A missing key is a compile error, so it cannot
degrade into an English word rendered on a Spanish page. A runtime key-parity
test backs this up for anything the type system cannot see.

### Collection copy stays colocated

A nested `es:` block carrying `name`, `heading` and `tagline` beside each
English original — in `gallery.yaml` for the 11, and in the `SYNTHETIC` array for
the 3. Adding a collection then means editing one place.

`name` is required because the collection filter chips render short labels
derived from the directory segments via `cap()` in the route — *Weddings*,
*Nightclub*, *Venture Capital Party*. Without a translated `name` the Spanish
gallery would keep an English navigation bar. The route also hardcodes three
English strings that move into the dictionary: the `Gallery` breadcrumb, the
`All` chip, and the `All {name}` parent chip.

`gallery.yaml` is machine-generated by `npm run generate`, so this was verified
rather than assumed: `mergeGalleriesObj` in `src/data/gallery-generator.ts` is
existing-wins. `getUpdatedCollectionList` only inserts when the id is absent,
and `getUpdatedImageList` preserves every field but refreshed exif. Hand-written
fields survive regeneration.

## SEO wiring

| Concern | Now | After |
|---|---|---|
| `<html lang>` | hardcoded `"en"` | per-locale |
| `og:locale` | bare `en` | `en_US` / `es_ES` (latent bug, fixed in passing) |
| hreflang | dormant | `en`, `es`, `x-default`→English, on all 34 pages |
| canonical | self-referencing | unchanged; Spanish pages canonical to themselves |
| sitemap | `sitemap()` | `sitemap({ i18n: {...} })`, alternates in the sitemap |
| JSON-LD | per-page nodes | `inLanguage` added |

Entity duplication across locales is the classic failure here — an unkeyed
`ProfessionalService` emitted on 34 pages in two languages is how one
photographer becomes two competing businesses in Google's index. Phase 1 already
prevents it: `schema.ts` exports `BUSINESS_ID` and `PERSON_ID`, and both nodes
carry a stable `@id`. Nothing to do beyond adding `inLanguage`. This corrects an
earlier draft of this spec, which listed the `@id` work as outstanding.

The language switcher renders its target from `alternates()` rather than
rebuilding paths, so the switcher and the hreflang tags cannot disagree.

## Copy plan

Roughly 1,200 words: `book.es.md` (329), HomeIntro (~170), 17 meta title and
description pairs (~510), 14 collection headings and taglines (~140), hero card,
nav and buttons (~40).

Spanish keywords are written to Spanish search intent — *fotógrafa de bodas en
Barcelona*, *sesión de fotos en Barcelona*, *fotógrafa de eventos Barcelona* —
not translated from the English meta. Each page's intended target query is
recorded alongside its copy so Hanna can sanity-check the mapping.

## Testing

- Unit tests for `localePath()` and for `alternates()`, which now returns three
  links where it previously returned `[]`
- Runtime key-parity test between `en.ts` and `es.ts`
- `scripts/check-seo.ts` extended: 17→34 pages, hreflang reciprocity (every
  advertised alternate must exist in `dist/`), and Spanish completeness across
  all 14 collections
- Hero card and the `/es/` pages need human review, not assertions

## Sequencing

1. Scaffolding and SEO wiring, English text in place — verifiable, ships nothing
   user-visible
2. Spanish copy
3. hreflang activation last, so Google never sees an alternate pointing at an
   unfinished page

## Risks

- **hreflang advertising a 404** is the classic way to make a site look broken to
  Google. Mitigated by sequencing activation last and by the reciprocity check.
- **Entity duplication** via unkeyed JSON-LD across locales. Already mitigated
  by the stable `@id` values Phase 1 shipped; the plan must not regress them.
- **Routing regressions** on the existing English collection pages during the
  shared-module extraction. Mitigated by the extraction being a pure refactor,
  with the existing unmapped-slug guard and `check-seo` unchanged in that step.
