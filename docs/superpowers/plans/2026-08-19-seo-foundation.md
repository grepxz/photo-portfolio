# SEO Foundation (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take cedar4st.com from zero SEO to a correctly crawlable, indexable site with unique per-page metadata, structured data, clean URLs, and real content signals — so that Google Search Console and Bing Webmaster can be pointed at it.

**Architecture:** A new `src/seo/` module of pure, dependency-free functions (metadata composition, JSON-LD builders, slugification) that unit-test directly under vitest. `MainLayout.astro` becomes the single place that renders head tags, driven by typed props each page supplies. Collection URLs are slugified before anything is submitted for indexing. Content changes add the missing subject matter to the homepage, gallery headers, and booking page.

**Tech Stack:** Astro 5 (static output), TypeScript (strict), Tailwind 4, vitest, js-yaml, `@astrojs/sitemap`, Cloudflare Web Analytics. Deployed to GitHub Pages via `.github/workflows/deploy.yml`.

**Spec:** `docs/superpowers/specs/2026-08-19-seo-foundation-design.md`

## Global Constraints

- **Site URL:** `https://cedar4st.com` — already set as `site` in `astro.config.mts`. Never hardcode it outside `src/seo/defaults.ts`.
- **Brand name:** `Cedar4st`. Owner display name: `Hanna`.
- **Titles:** target ≤ 60 characters. Every page must have a unique, non-empty title and description.
- **`src/seo/` must stay pure.** No imports from `astro:*`, no imports from `site.config.mts` (it imports `lucide-astro`, which pulls Astro components into unit tests). SEO constants are defined in `src/seo/defaults.ts` as the single source of truth.
- **Import extensions:** this codebase writes `.ts` extensions in relative imports (`'../imageStore.ts'`). Match it.
- **Tests:** vitest, colocated in a `__tests__/` directory beside the source. Run with `npm test`.
- **Formatting:** prettier with tabs, single quotes, and a 100-character print width (`prettier.config.js`). Run `npm run prettier` before committing if unsure. `.pre-commit-config.yaml` enforces this in CI.
- **hreflang rule:** emit `hreflang` only for locales that actually have the page. A tag pointing at a 404 is worse than no tag.
- **URL slugs must land before the sitemap is submitted.** GitHub Pages cannot serve 301 redirects cleanly.
- **Robots policy:** allow all search crawlers; block `GPTBot`, `CCBot`, `Google-Extended`, `ClaudeBot`.
- **Branch:** all work happens on `seo-foundation`.

## Owner-supplied values

Supplied by the owner on 2026-08-19:

- **Instagram:** `https://www.instagram.com/bluecatch.ca/` — used as `sameAs` in
  Task 2 and corrected in `site.config.mts` in Task 4. Consistent with the
  existing Cal.com handle `bluecatch/consultation`.
- **Repository:** `https://github.com/grepxz/photo-portfolio` — replaces the
  upstream template author's URL in `site.config.mts:20`.

Still outstanding, blocking one task only:

- **Cloudflare Web Analytics site token.** Needed for Task 13. Every other task
  proceeds without it.

---

### Task 1: SEO defaults and metadata composition

Pure functions with no Astro dependency. Nothing renders yet; this task exists so the metadata logic is tested in isolation before anything consumes it.

**Files:**
- Create: `src/seo/defaults.ts`
- Create: `src/seo/meta.ts`
- Test: `src/seo/__tests__/meta.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SITE`, `BRAND`, `OWNER`, `DEFAULT_OG_IMAGE`, `LOCALES`, `DEFAULT_LOCALE`, `type Locale` from `defaults.ts`; `composeTitle(title: string): string`, `canonicalFor(path: string): string`, `buildMeta(input: MetaInput): ResolvedMeta`, and the `MetaInput` / `ResolvedMeta` interfaces from `meta.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/seo/__tests__/meta.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BRAND, SITE } from '../defaults.ts';
import { buildMeta, canonicalFor, composeTitle } from '../meta.ts';

describe('composeTitle', () => {
	it('appends the brand to a bare page title', () => {
		expect(composeTitle('Wedding Photography in Barcelona')).toEqual(
			`Wedding Photography in Barcelona — ${BRAND}`,
		);
	});

	it('does not append the brand twice', () => {
		expect(composeTitle(`Photography Portfolio — ${BRAND}`)).toEqual(
			`Photography Portfolio — ${BRAND}`,
		);
	});

	it('collapses surrounding whitespace', () => {
		expect(composeTitle('  Book Me  ')).toEqual(`Book Me — ${BRAND}`);
	});
});

describe('canonicalFor', () => {
	it('builds an absolute URL from a site-relative path', () => {
		expect(canonicalFor('/collections/weddings/')).toEqual(`${SITE}/collections/weddings/`);
	});

	it('adds a trailing slash', () => {
		expect(canonicalFor('/collections/weddings')).toEqual(`${SITE}/collections/weddings/`);
	});

	it('leaves the root path as a single slash', () => {
		expect(canonicalFor('/')).toEqual(`${SITE}/`);
	});

	it('normalises a missing leading slash', () => {
		expect(canonicalFor('book')).toEqual(`${SITE}/book/`);
	});
});

describe('buildMeta', () => {
	const input = {
		title: 'Book Me',
		description: 'Booking enquiries for photography in Barcelona.',
		path: '/book/',
	};

	it('resolves title, description and canonical', () => {
		const meta = buildMeta(input);
		expect(meta.title).toEqual(`Book Me — ${BRAND}`);
		expect(meta.description).toEqual(input.description);
		expect(meta.canonical).toEqual(`${SITE}/book/`);
	});

	it('mirrors the resolved values into Open Graph tags', () => {
		const meta = buildMeta(input);
		expect(meta.og.title).toEqual(meta.title);
		expect(meta.og.description).toEqual(meta.description);
		expect(meta.og.url).toEqual(meta.canonical);
		expect(meta.og.type).toEqual('website');
	});

	it('falls back to the default Open Graph image', () => {
		const meta = buildMeta(input);
		expect(meta.og.image).toEqual(`${SITE}/images/profile.webp`);
	});

	it('makes a supplied relative image absolute', () => {
		const meta = buildMeta({ ...input, image: '/images/custom.webp' });
		expect(meta.og.image).toEqual(`${SITE}/images/custom.webp`);
	});

	it('leaves an already-absolute image untouched', () => {
		const meta = buildMeta({ ...input, image: 'https://cdn.example.com/a.webp' });
		expect(meta.og.image).toEqual('https://cdn.example.com/a.webp');
	});

	it('uses a large summary card', () => {
		expect(buildMeta(input).twitter.card).toEqual('summary_large_image');
	});

	it('defaults to the English locale', () => {
		expect(buildMeta(input).og.locale).toEqual('en');
	});

	it('carries an explicit locale through', () => {
		expect(buildMeta({ ...input, locale: 'es' }).og.locale).toEqual('es');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/seo/__tests__/meta.test.ts`
Expected: FAIL — cannot resolve `../defaults.ts` or `../meta.ts`.

- [ ] **Step 3: Write `src/seo/defaults.ts`**

```ts
/**
 * Single source of truth for SEO constants.
 *
 * Deliberately standalone: site.config.mts imports lucide-astro, which drags
 * Astro components into any unit test that touches it. Everything here must
 * stay importable from plain vitest.
 */

/** Origin only, no trailing slash. Mirrors `site` in astro.config.mts. */
export const SITE = 'https://cedar4st.com';

export const BRAND = 'Cedar4st';

export const OWNER = 'Hanna';

/** Separator between a page title and the brand. */
export const TITLE_SEPARATOR = ' — ';

/** Site-relative path to the fallback social sharing image. */
export const DEFAULT_OG_IMAGE = '/images/profile.webp';

export const LOCALES = ['en', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** One-line positioning statement, reused as the homepage description base. */
export const POSITIONING = 'Documentary, event and wedding photographer in Barcelona.';
```

- [ ] **Step 4: Write `src/seo/meta.ts`**

```ts
import {
	BRAND,
	DEFAULT_LOCALE,
	DEFAULT_OG_IMAGE,
	SITE,
	TITLE_SEPARATOR,
	type Locale,
} from './defaults.ts';

export interface MetaInput {
	/** Page title without the brand suffix. */
	title: string;
	description: string;
	/** Site-relative path, with or without leading and trailing slashes. */
	path: string;
	/** Site-relative or absolute image URL. Falls back to DEFAULT_OG_IMAGE. */
	image?: string;
	locale?: Locale;
}

export interface ResolvedMeta {
	title: string;
	description: string;
	canonical: string;
	og: {
		title: string;
		description: string;
		url: string;
		image: string;
		type: 'website';
		locale: Locale;
	};
	twitter: {
		card: 'summary_large_image';
		title: string;
		description: string;
		image: string;
	};
}

/** Appends the brand unless the title already carries it. */
export const composeTitle = (title: string): string => {
	const trimmed = title.trim();
	return trimmed.includes(BRAND) ? trimmed : `${trimmed}${TITLE_SEPARATOR}${BRAND}`;
};

/**
 * Absolute canonical URL with a trailing slash.
 *
 * Astro's default build format is 'directory', so every route is served at a
 * trailing-slash URL. Canonicals must agree or they self-conflict.
 */
export const canonicalFor = (path: string): string => {
	const trimmed = path.trim().replace(/^\/+/, '').replace(/\/+$/, '');
	return trimmed === '' ? `${SITE}/` : `${SITE}/${trimmed}/`;
};

const absoluteUrl = (value: string): string =>
	/^https?:\/\//.test(value) ? value : `${SITE}${value.startsWith('/') ? '' : '/'}${value}`;

export const buildMeta = (input: MetaInput): ResolvedMeta => {
	const title = composeTitle(input.title);
	const description = input.description.trim();
	const canonical = canonicalFor(input.path);
	const image = absoluteUrl(input.image ?? DEFAULT_OG_IMAGE);
	const locale = input.locale ?? DEFAULT_LOCALE;

	return {
		title,
		description,
		canonical,
		og: { title, description, url: canonical, image, type: 'website', locale },
		twitter: { card: 'summary_large_image', title, description, image },
	};
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/seo/__tests__/meta.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 6: Commit**

```bash
git add src/seo/defaults.ts src/seo/meta.ts src/seo/__tests__/meta.test.ts
git commit -m "Add SEO defaults and metadata composition"
```

---

### Task 2: JSON-LD structured data builders

Still pure. Describes the business as a Barcelona service-area photographer with no street address, matching what will eventually go into Google Business Profile.

**Files:**
- Create: `src/seo/schema.ts`
- Test: `src/seo/__tests__/schema.test.ts`

**Interfaces:**
- Consumes: `SITE`, `BRAND`, `OWNER`, `POSITIONING`, `DEFAULT_OG_IMAGE` from `defaults.ts`.
- Produces: `professionalService(): JsonLd`, `person(): JsonLd`, `breadcrumbList(crumbs: Crumb[]): JsonLd`, `type Crumb = { name: string; path: string }`, `BUSINESS_ID`, `PERSON_ID`.

- [ ] **Step 1: Write the failing test**

Create `src/seo/__tests__/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BRAND, OWNER, SITE } from '../defaults.ts';
import { BUSINESS_ID, breadcrumbList, person, professionalService } from '../schema.ts';

describe('professionalService', () => {
	const schema = professionalService();

	it('is a ProfessionalService in the schema.org context', () => {
		expect(schema['@context']).toEqual('https://schema.org');
		expect(schema['@type']).toEqual('ProfessionalService');
	});

	it('carries a stable identifier other nodes can reference', () => {
		expect(schema['@id']).toEqual(BUSINESS_ID);
	});

	it('is named for the brand and points at the site', () => {
		expect(schema.name).toEqual(BRAND);
		expect(schema.url).toEqual(`${SITE}/`);
	});

	it('emits no postal address, because this is a service-area business', () => {
		expect(schema).not.toHaveProperty('address');
	});

	it('serves Barcelona', () => {
		expect(schema.areaServed).toMatchObject({ '@type': 'City', name: 'Barcelona' });
	});

	it('lists the service types that have galleries behind them', () => {
		expect(schema.serviceType).toEqual(
			expect.arrayContaining([
				'Wedding photography',
				'Event photography',
				'Documentary photography',
			]),
		);
	});

	it('links the Instagram profile as sameAs', () => {
		expect(schema.sameAs).toContain('https://www.instagram.com/bluecatch.ca/');
	});

	it('never claims the bare instagram.com domain as an identity', () => {
		expect(schema.sameAs).not.toContain('https://www.instagram.com');
	});
});

describe('person', () => {
	const schema = person();

	it('describes the owner and links to the business', () => {
		expect(schema['@type']).toEqual('Person');
		expect(schema.name).toEqual(OWNER);
		expect(schema.worksFor).toEqual({ '@id': BUSINESS_ID });
	});

	it('states the occupation', () => {
		expect(schema.jobTitle).toEqual('Photographer');
	});
});

describe('breadcrumbList', () => {
	it('numbers positions from one and resolves absolute URLs', () => {
		const schema = breadcrumbList([
			{ name: 'Gallery', path: '/collections/' },
			{ name: 'Events', path: '/collections/events/' },
			{ name: 'Nightclub', path: '/collections/events/nightclub/' },
		]);

		expect(schema['@type']).toEqual('BreadcrumbList');
		expect(schema.itemListElement).toHaveLength(3);
		expect(schema.itemListElement[0]).toMatchObject({
			position: 1,
			name: 'Gallery',
			item: `${SITE}/collections/`,
		});
		expect(schema.itemListElement[2]).toMatchObject({
			position: 3,
			item: `${SITE}/collections/events/nightclub/`,
		});
	});

	it('returns an empty list for no crumbs', () => {
		expect(breadcrumbList([]).itemListElement).toEqual([]);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/seo/__tests__/schema.test.ts`
Expected: FAIL — cannot resolve `../schema.ts`.

- [ ] **Step 3: Write `src/seo/schema.ts`**

```ts
import { BRAND, DEFAULT_OG_IMAGE, OWNER, POSITIONING, SITE } from './defaults.ts';
import { canonicalFor } from './meta.ts';

export type JsonLd = Record<string, unknown>;

/** Stable node identifiers so schema nodes can cross-reference each other. */
export const BUSINESS_ID = `${SITE}/#business`;
export const PERSON_ID = `${SITE}/#hanna`;

/**
 * Profile URLs proving this entity is the same one found elsewhere. Only add
 * URLs that identify a specific profile — a bare domain identifies nothing and
 * emitting it would be a false identity claim.
 */
const SAME_AS: string[] = ['https://www.instagram.com/bluecatch.ca/'];

/** Categories with actual galleries behind them. Kept honest on purpose. */
const SERVICE_TYPES = [
	'Wedding photography',
	'Event photography',
	'Documentary photography',
	'Concert and nightlife photography',
	'Sports photography',
	'Portrait photography',
];

export const professionalService = (): JsonLd => {
	const schema: JsonLd = {
		'@context': 'https://schema.org',
		'@type': 'ProfessionalService',
		'@id': BUSINESS_ID,
		name: BRAND,
		description: POSITIONING,
		url: `${SITE}/`,
		image: `${SITE}${DEFAULT_OG_IMAGE}`,
		areaServed: {
			'@type': 'City',
			name: 'Barcelona',
			address: { '@type': 'PostalAddress', addressCountry: 'ES' },
		},
		serviceType: SERVICE_TYPES,
		founder: { '@id': PERSON_ID },
		knowsLanguage: ['en', 'es'],
	};

	if (SAME_AS.length > 0) {
		schema.sameAs = SAME_AS;
	}

	return schema;
};

export const person = (): JsonLd => ({
	'@context': 'https://schema.org',
	'@type': 'Person',
	'@id': PERSON_ID,
	name: OWNER,
	jobTitle: 'Photographer',
	url: `${SITE}/book/`,
	worksFor: { '@id': BUSINESS_ID },
});

export interface Crumb {
	name: string;
	path: string;
}

export const breadcrumbList = (crumbs: Crumb[]): JsonLd => ({
	'@context': 'https://schema.org',
	'@type': 'BreadcrumbList',
	itemListElement: crumbs.map((crumb, index) => ({
		'@type': 'ListItem',
		position: index + 1,
		name: crumb.name,
		item: canonicalFor(crumb.path),
	})),
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/seo/__tests__/schema.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/seo/schema.ts src/seo/__tests__/schema.test.ts
git commit -m "Add JSON-LD builders for a Barcelona service-area business"
```

---

### Task 3: Collection URL slugification

Collection routes are built from directory names containing spaces and capitals, so they serve as percent-encoded URLs like `/collections/activism/Barcelona%20Pride/`. This must land before the sitemap is submitted.

**Files:**
- Create: `src/seo/slug.ts`
- Test: `src/seo/__tests__/slug.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `slugifySegment(segment: string): string`, `slugifyId(id: string): string`, `buildSlugMap(ids: string[]): Map<string, string>` (slug → original id), `SlugCollisionError`.

- [ ] **Step 1: Write the failing test**

Create `src/seo/__tests__/slug.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SlugCollisionError, buildSlugMap, slugifyId, slugifySegment } from '../slug.ts';

describe('slugifySegment', () => {
	it('lowercases', () => {
		expect(slugifySegment('Weddings')).toEqual('weddings');
	});

	it('replaces spaces with hyphens', () => {
		expect(slugifySegment('Barcelona Pride')).toEqual('barcelona-pride');
	});

	it('collapses runs of separators into one hyphen', () => {
		expect(slugifySegment('Venture  capital   party')).toEqual('venture-capital-party');
	});

	it('strips accents', () => {
		expect(slugifySegment('Café Münster')).toEqual('cafe-munster');
	});

	it('drops leading and trailing separators', () => {
		expect(slugifySegment(' -Pitch deck- ')).toEqual('pitch-deck');
	});

	it('removes punctuation', () => {
		expect(slugifySegment("Hanna's Work!")).toEqual('hanna-s-work');
	});
});

describe('slugifyId', () => {
	it('slugifies each segment and preserves nesting', () => {
		expect(slugifyId('events/networking/Venture capital party')).toEqual(
			'events/networking/venture-capital-party',
		);
	});

	it('handles a single segment', () => {
		expect(slugifyId('weddings')).toEqual('weddings');
	});
});

describe('buildSlugMap', () => {
	it('maps every slug back to its original id', () => {
		const map = buildSlugMap(['weddings', 'activism/Barcelona Pride']);
		expect(map.get('weddings')).toEqual('weddings');
		expect(map.get('activism/barcelona-pride')).toEqual('activism/Barcelona Pride');
	});

	it('maps the real gallery ids without collision', () => {
		const ids = [
			'events/nightclub',
			'events/networking/Venture capital party',
			'events/networking/Pitch deck',
			'events/networking/Startup panel',
			'events/networking/corporate dinner',
			'events/sport',
			'events/birthday',
			'activism/Barcelona Pride',
			'activism/Mexico',
			'activism/Ukraine',
			'weddings',
		];
		expect(buildSlugMap(ids).size).toEqual(ids.length);
	});

	it('throws when two ids collapse to the same slug', () => {
		expect(() => buildSlugMap(['events/Pitch Deck', 'events/pitch deck'])).toThrow(
			SlugCollisionError,
		);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/seo/__tests__/slug.test.ts`
Expected: FAIL — cannot resolve `../slug.ts`.

- [ ] **Step 3: Write `src/seo/slug.ts`**

```ts
/**
 * Collection ids mirror directory names on disk, which contain spaces and
 * capitals. Those serve as percent-encoded URLs, which read badly in search
 * results and split link equity when some inbound links encode and others do
 * not. Slugs are a presentation concern only: ids and directories are untouched.
 */

export class SlugCollisionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SlugCollisionError';
	}
}

export const slugifySegment = (segment: string): string =>
	segment
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export const slugifyId = (id: string): string => id.split('/').map(slugifySegment).join('/');

/**
 * Builds the slug -> id lookup used to resolve an incoming route back to the
 * collection it names. Throws rather than silently dropping a collection if two
 * ids collapse to the same slug.
 */
export const buildSlugMap = (ids: string[]): Map<string, string> => {
	const map = new Map<string, string>();
	for (const id of ids) {
		const slug = slugifyId(id);
		const existing = map.get(slug);
		if (existing !== undefined && existing !== id) {
			throw new SlugCollisionError(
				`Collections '${existing}' and '${id}' both slugify to '${slug}'`,
			);
		}
		map.set(slug, id);
	}
	return map;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/seo/__tests__/slug.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/seo/slug.ts src/seo/__tests__/slug.test.ts
git commit -m "Add collection URL slugification"
```

---

### Task 4: Render metadata from MainLayout

Wires Tasks 1 and 2 into the page head, and fixes the duplicate font load on the same critical path.

**Files:**
- Modify: `src/layouts/MainLayout.astro` (whole file)
- Modify: `src/components/NavBar.astro:11-17` (remove the duplicated font block)
- Modify: `src/pages/index.astro`
- Modify: `src/pages/book.astro`
- Modify: `site.config.mts:18-27` (correct both social URLs)

**Interfaces:**
- Consumes: `buildMeta`, `ResolvedMeta` from `src/seo/meta.ts`; `professionalService`, `person`, `type JsonLd` from `src/seo/schema.ts`.
- Produces: `MainLayout` accepting `Props { title: string; description: string; image?: string; jsonLd?: JsonLd[] }`.

- [ ] **Step 1: Rewrite the head of `src/layouts/MainLayout.astro`**

Replace the frontmatter and `<head>` with:

```astro
---
import '../styles/global.css';
import siteConfig from '../../site.config.mjs';
import Footer from '../components/Footer.astro';
import NavBar from '../components/NavBar.astro';
import { buildMeta } from '../seo/meta.ts';
import { person, professionalService, type JsonLd } from '../seo/schema.ts';

interface Props {
	title: string;
	description: string;
	image?: string;
	/** Page-specific structured data, appended after the site-wide nodes. */
	jsonLd?: JsonLd[];
}

const { title, description, image, jsonLd = [] } = Astro.props;
const favicon = siteConfig.favicon;

const meta = buildMeta({ title, description, image, path: Astro.url.pathname });
const structuredData: JsonLd[] = [professionalService(), person(), ...jsonLd];
---

<html lang="en" class="h-full">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="generator" content={Astro.generator} />
		<link rel="icon" type="image/x-icon" href={`/${favicon}`} />

		<title>{meta.title}</title>
		<meta name="description" content={meta.description} />
		<link rel="canonical" href={meta.canonical} />

		<meta property="og:site_name" content="Cedar4st" />
		<meta property="og:type" content={meta.og.type} />
		<meta property="og:title" content={meta.og.title} />
		<meta property="og:description" content={meta.og.description} />
		<meta property="og:url" content={meta.og.url} />
		<meta property="og:image" content={meta.og.image} />
		<meta property="og:locale" content={meta.og.locale} />

		<meta name="twitter:card" content={meta.twitter.card} />
		<meta name="twitter:title" content={meta.twitter.title} />
		<meta name="twitter:description" content={meta.twitter.description} />
		<meta name="twitter:image" content={meta.twitter.image} />

		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
		<link
			href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap"
			rel="stylesheet"
		/>

		{
			structuredData.map((node) => (
				<script type="application/ld+json" set:html={JSON.stringify(node)} />
			))
		}
	</head>
	<body>
		<NavBar />
		<main>
			<slot />
		</main>
		<Footer />
	</body>
</html>

<script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

Note the two font-weight syntaxes in the codebase differed (`400;500;600;700` in the layout, `400..700` in the navbar). Keep the `400..700` variable-font range — it is the smaller request.

- [ ] **Step 2: Remove the duplicate font block from `src/components/NavBar.astro`**

Delete these seven lines from the top of the template (they sit between the frontmatter fence and `<nav`):

```astro
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
	href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap"
	rel="stylesheet"
/>
```

- [ ] **Step 3: Give `src/pages/index.astro` its metadata**

Change the `<MainLayout>` opening tag to:

```astro
<MainLayout
	title="Photographer in Barcelona"
	description="Hanna is a documentary, event and wedding photographer based in Barcelona. Weddings, nightlife, concerts, sport and journalistic work."
>
```

- [ ] **Step 4: Give `src/pages/book.astro` its metadata**

Change the `<MainLayout>` opening tag to:

```astro
<MainLayout
	title="Book a Photographer in Barcelona"
	description="Book Hanna for weddings, events, portraits and documentary work in Barcelona. Reduced rates and TFP available for selected shoot types."
>
```

- [ ] **Step 4b: Correct the social URLs in `site.config.mts`**

Both currently point somewhere wrong: the GitHub entry at the upstream template
author's repository, and the Instagram entry at the bare domain. These render as
outbound links in the site footer, so they are a live trust signal as well as a
schema one.

```ts
	socialLinks: [
		{
			name: 'GitHub',
			url: 'https://github.com/grepxz/photo-portfolio',
			icon: Github,
		} as SocialLink,
		{
			name: 'Instagram',
			url: 'https://www.instagram.com/bluecatch.ca/',
			icon: Instagram,
		} as SocialLink,
	],
```

- [ ] **Step 5: Build and inspect the output**

Run: `npm run build`
Then: `grep -o '<title>[^<]*</title>' dist/index.html dist/book/index.html`
Expected: `Photographer in Barcelona — Cedar4st` and `Book a Photographer in Barcelona — Cedar4st`.

Then: `grep -c 'fonts.googleapis.com/css2' dist/index.html`
Expected: `1` (was 2).

Collection pages will fail the build at this point because they do not yet pass the required props — that is expected and Task 5 fixes it. If the build errors on `[...collection].astro`, proceed to Task 5 and build again there.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/MainLayout.astro src/components/NavBar.astro src/pages/index.astro src/pages/book.astro site.config.mts
git commit -m "Render per-page metadata and structured data from MainLayout"
```

Also confirm the schema picked up the profile:
`grep -o 'instagram.com/bluecatch.ca/' dist/index.html | head -1` — expected: one match.

---

### Task 5: Slugged collection routes with per-collection metadata and headings

The largest task. Applies slugs to the route, gives each of the 15 routes its own title, description, `<h1>` and tagline, and adds breadcrumb structured data.

**Files:**
- Modify: `src/gallery/gallery.yaml` (collections block only)
- Modify: `src/data/galleryData.ts` (the `Collection` interface)
- Modify: `src/pages/collections/[...collection].astro`
- Test: `src/seo/__tests__/collectionMeta.test.ts`
- Create: `src/seo/collectionMeta.ts`

**Interfaces:**
- Consumes: `slugifyId`, `buildSlugMap` from `src/seo/slug.ts`; `composeTitle` from `src/seo/meta.ts`; `breadcrumbList`, `type Crumb` from `src/seo/schema.ts`; `getCollections`, `getImages` from `src/data/imageStore.ts`.
- Produces: `collectionMeta(id: string | undefined, collections: Collection[]): CollectionMeta` where `CollectionMeta = { heading: string; tagline: string; title: string; description: string }`.

- [ ] **Step 1: Add `heading` and `tagline` to the `Collection` interface**

In `src/data/galleryData.ts`, replace the `Collection` interface with:

```ts
/**
 * Represents a collection of images
 * @property {string} id - Collection identifier, mirroring its directory path
 * @property {string} name - Display name of the collection
 * @property {string} [heading] - Page h1. Falls back to a template.
 * @property {string} [tagline] - Sub-heading and meta description source.
 */
export interface Collection {
	id: string;
	name: string;
	heading?: string;
	tagline?: string;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/seo/__tests__/collectionMeta.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Collection } from '../../data/galleryData.ts';
import { collectionMeta } from '../collectionMeta.ts';

const COLLECTIONS: Collection[] = [
	{
		id: 'weddings',
		name: 'Weddings',
		heading: 'Wedding Photography in Barcelona',
		tagline: 'Ceremonies and celebrations photographed as they happen.',
	},
	{ id: 'events/sport', name: 'Events Sport' },
];

describe('collectionMeta', () => {
	it('describes the root gallery when no collection is given', () => {
		const meta = collectionMeta(undefined, COLLECTIONS);
		expect(meta.heading).toEqual('Photography Portfolio — Barcelona');
		expect(meta.tagline).toContain('Weddings, events, nightlife');
		expect(meta.title).toEqual('Photography Portfolio — Barcelona');
	});

	it('uses the configured heading and tagline when present', () => {
		const meta = collectionMeta('weddings', COLLECTIONS);
		expect(meta.heading).toEqual('Wedding Photography in Barcelona');
		expect(meta.tagline).toEqual('Ceremonies and celebrations photographed as they happen.');
		expect(meta.description).toEqual('Ceremonies and celebrations photographed as they happen.');
	});

	it('falls back to a template for collections without copy', () => {
		const meta = collectionMeta('events/sport', COLLECTIONS);
		expect(meta.heading).toEqual('Events Sport Photography');
		expect(meta.tagline).toContain('Barcelona');
		expect(meta.description).toContain('Events Sport');
	});

	it('derives a name for an intermediate node absent from the collections list', () => {
		const meta = collectionMeta('events', COLLECTIONS);
		expect(meta.heading).toEqual('Events Photography');
	});

	it('always produces a non-empty title and description', () => {
		for (const id of [undefined, 'weddings', 'events/sport', 'events']) {
			const meta = collectionMeta(id, COLLECTIONS);
			expect(meta.title.length).toBeGreaterThan(0);
			expect(meta.description.length).toBeGreaterThan(0);
		}
	});
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/seo/__tests__/collectionMeta.test.ts`
Expected: FAIL — cannot resolve `../collectionMeta.ts`.

- [ ] **Step 4: Write `src/seo/collectionMeta.ts`**

```ts
import type { Collection } from '../data/galleryData.ts';

export interface CollectionMeta {
	/** Visible page h1. */
	heading: string;
	/** Visible sub-heading, reused as the meta description. */
	tagline: string;
	/** Page title, before the brand suffix is appended. */
	title: string;
	description: string;
}

const ROOT: CollectionMeta = {
	heading: 'Photography Portfolio — Barcelona',
	tagline: 'Weddings, events, nightlife and documentary work, shot across Barcelona and beyond.',
	title: 'Photography Portfolio — Barcelona',
	description:
		'Weddings, events, nightlife and documentary work, shot across Barcelona and beyond by photographer Hanna.',
};

/** Turns a path segment into a display name, matching the page component. */
const humanise = (segment: string): string =>
	segment
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.split(' ')
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');

export const collectionMeta = (
	id: string | undefined,
	collections: Collection[],
): CollectionMeta => {
	if (!id) return ROOT;

	const configured = collections.find((collection) => collection.id === id);
	const name = configured?.name ?? humanise(id.split('/').pop() ?? id);

	const heading = configured?.heading ?? `${name} Photography`;
	const tagline = configured?.tagline ?? `${name} photography in Barcelona by Hanna.`;

	return {
		heading,
		tagline,
		title: heading,
		description: tagline,
	};
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/seo/__tests__/collectionMeta.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Add the approved copy to `src/gallery/gallery.yaml`**

Replace the `collections:` block at the top of the file (leave `images:` untouched):

```yaml
collections:
  - id: events/nightclub
    name: Events Nightclub
    heading: Nightlife & Club Photography
    tagline: Late nights in Barcelona, shot in available light.
  - id: events/networking/Venture capital party
    name: Events Networking Venture Capital Party
  - id: events/networking/Pitch deck
    name: Events Networking Pitch Deck
  - id: events/networking/Startup panel
    name: Events Networking Startup Panel
  - id: events/networking/corporate dinner
    name: Events Networking Corporate Dinner
  - id: events/sport
    name: Events Sport
  - id: events/birthday
    name: Events Birthday
  - id: activism/Barcelona Pride
    name: Activism Barcelona Pride
    heading: Barcelona Pride
    tagline: Documentary coverage of Pride in Barcelona.
  - id: activism/Mexico
    name: Activism Mexico
  - id: activism/Ukraine
    name: Activism Ukraine
  - id: weddings
    name: Weddings
    heading: Wedding Photography in Barcelona
    tagline: >-
      Ceremonies and celebrations photographed as they happen — minimal
      direction, minimal editing.
```

The `events` and `activism` intermediate nodes are not entries in this list; they are synthesised by the page's tree builder. Their copy is supplied in Step 7.

- [ ] **Step 7: Rewrite `src/pages/collections/[...collection].astro`**

Replace the entire file:

```astro
---
import MainLayout from '../../layouts/MainLayout.astro';
import PhotoGrid from '../../components/PhotoGrid.astro';
import { getCollections, getImages } from '../../data/imageStore';
import type { Collection } from '../../data/galleryData';
import { collectionMeta } from '../../seo/collectionMeta.ts';
import { breadcrumbList, type Crumb } from '../../seo/schema.ts';
import { buildSlugMap, slugifyId } from '../../seo/slug.ts';

const cap = (s: string) =>
	s
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.split(' ')
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(' ');

/**
 * Copy for the intermediate tree nodes, which are synthesised from the id paths
 * rather than declared in gallery.yaml.
 */
const SYNTHETIC: Collection[] = [
	{
		id: 'events',
		name: 'Events',
		heading: 'Event Photography in Barcelona',
		tagline: 'Nightlife, corporate evenings, sport and private celebrations.',
	},
	{
		id: 'activism',
		name: 'Activism',
		heading: 'Documentary & Journalistic Work',
		tagline: 'Protest, movement and street photography from Barcelona, Mexico and Ukraine.',
	},
	{ id: 'events/networking', name: 'Events Networking' },
];

type Node = {
	id: string;
	name: string;
	children: Map<string, Node>;
};

const buildTree = (ids: string[]): Node => {
	const root: Node = { id: '', name: 'All', children: new Map() };
	for (const id of ids) {
		const segments = id.split('/');
		let cur = root;
		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			const fullId = segments.slice(0, i + 1).join('/');
			if (!cur.children.has(seg)) {
				cur.children.set(seg, { id: fullId, name: cap(seg), children: new Map() });
			}
			cur = cur.children.get(seg)!;
		}
	}
	return root;
};

const rawCollections = await getCollections();
const allCollections = [...rawCollections, ...SYNTHETIC];
const tree = buildTree(rawCollections.map((c) => c.id));

// The route carries the slug; everything downstream works with the real id.
const { collection: slug } = Astro.params;
const slugMap = buildSlugMap(rawCollections.map((c) => c.id).concat(SYNTHETIC.map((c) => c.id)));
const collection = slug ? slugMap.get(slug) : undefined;

const images = await getImages(collection ? { collection } : {});
const activeSegments = collection ? collection.split('/') : [];
const meta = collectionMeta(collection, allCollections);

const crumbs: Crumb[] = [{ name: 'Gallery', path: '/collections/' }];
if (collection) {
	const segments = collection.split('/');
	for (let i = 0; i < segments.length; i++) {
		const id = segments.slice(0, i + 1).join('/');
		crumbs.push({
			name: collectionMeta(id, allCollections).heading,
			path: `/collections/${slugifyId(id)}/`,
		});
	}
}

type Row = {
	parentId: string | undefined;
	parentName: string;
	items: { id: string; name: string }[];
	activeId: string | undefined;
};

const rows: Row[] = [];
{
	let cur: Node | undefined = tree;
	for (let depth = 0; cur && cur.children.size > 0; depth++) {
		const items = [...cur.children.values()].map((c) => ({ id: c.id, name: c.name }));
		const activeChildSeg = activeSegments[depth];
		const activeChild = activeChildSeg ? cur.children.get(activeChildSeg) : undefined;
		const row: Row = {
			parentId: cur.id || undefined,
			parentName: cur.id ? cur.name : 'All',
			items,
			activeId: activeChild?.id,
		};
		if (depth > 0) {
			row.items = [...row.items, { id: cur.id, name: `All ${cur.name}` }];
		}
		rows.push(row);
		cur = activeChild;
	}
}

export const getStaticPaths = async () => {
	const cols = await getCollections();
	const t = (() => {
		const root: { children: Map<string, any> } = { children: new Map() };
		for (const c of cols) {
			const segs = c.id.split('/');
			let cur: any = root;
			for (let i = 0; i < segs.length; i++) {
				const seg = segs[i];
				const fullId = segs.slice(0, i + 1).join('/');
				if (!cur.children.has(seg)) cur.children.set(seg, { id: fullId, children: new Map() });
				cur = cur.children.get(seg);
			}
		}
		return root;
	})();
	const ids = new Set<string | undefined>([undefined]);
	const walk = (n: any) => {
		if (n.id) ids.add(n.id);
		for (const c of n.children.values()) walk(c);
	};
	walk(t);
	// Routes are emitted under slugs; the page resolves the slug back to the id.
	return [...ids].map((id) => ({ params: { collection: id ? slugifyId(id) : undefined } }));
};
---

<MainLayout
	title={meta.title}
	description={meta.description}
	jsonLd={[breadcrumbList(crumbs)]}
>
	<section class="py-16 pt-24">
		<div class="container-custom">
			<div class="mb-16 text-center">
				<h1 class="text-4xl md:text-5xl font-bold mb-4">{meta.heading}</h1>
				<p class="text-gray-600 max-w-xl mx-auto italic">{meta.tagline}</p>
			</div>

			{
				rows.map((row, idx) => (
					<div class={`flex justify-center ${idx === rows.length - 1 ? 'mb-10' : 'mb-4'}`}>
						<div class="flex flex-wrap gap-2 justify-center">
							{idx === 0 && (
								<a href="/collections/" class="order-last">
									<div
										class={`px-4 py-2 border ${
											!collection
												? 'border-black bg-black text-white'
												: 'border-gray-200 text-gray-700 hover:border-gray-300'
										} transition-all`}
									>
										All
									</div>
								</a>
							)}
							{row.items.map((item) => {
								const isActive =
									item.id === collection ||
									(collection !== undefined && collection.startsWith(item.id + '/'));
								const sizeClass = idx === 0 ? 'px-4 py-2' : 'px-3 py-1 text-sm';
								return (
									<a href={`/collections/${slugifyId(item.id)}/`}>
										<div
											class={`${sizeClass} border ${
												isActive
													? 'border-black bg-black text-white'
													: 'border-gray-200 text-gray-700 hover:border-gray-300'
											} transition-all`}
										>
											{item.name}
										</div>
									</a>
								);
							})}
						</div>
					</div>
				))
			}

			<PhotoGrid images={images} />
		</div>
	</section>
</MainLayout>
```

- [ ] **Step 5b: Run the full test suite**

Run: `npm test`
Expected: PASS. The `imageStore` tests still pass because `heading` and `tagline` are optional additions.

- [ ] **Step 6: Build and verify the slugged routes**

Run: `npm run build`
Then: `find dist/collections -name index.html | sort`

Expected — no spaces or capitals in any path:

```
dist/collections/activism/barcelona-pride/index.html
dist/collections/activism/index.html
dist/collections/activism/mexico/index.html
dist/collections/activism/ukraine/index.html
dist/collections/events/birthday/index.html
dist/collections/events/index.html
dist/collections/events/networking/corporate-dinner/index.html
dist/collections/events/networking/index.html
dist/collections/events/networking/pitch-deck/index.html
dist/collections/events/networking/startup-panel/index.html
dist/collections/events/networking/venture-capital-party/index.html
dist/collections/events/nightclub/index.html
dist/collections/events/sport/index.html
dist/collections/index.html
dist/collections/weddings/index.html
```

Then confirm titles differ:
`grep -h -o '<title>[^<]*</title>' dist/collections/weddings/index.html dist/collections/events/index.html`
Expected: `Wedding Photography in Barcelona — Cedar4st` and `Event Photography in Barcelona — Cedar4st`.

- [ ] **Step 7: Verify the filter links resolve**

Run: `npm run preview`, open `http://localhost:4321/collections/`, and click through to a nested collection (Events → Networking → Pitch Deck). Confirm the URL reads `/collections/events/networking/pitch-deck/` and photographs render. Stop the preview server.

- [ ] **Step 8: Commit**

```bash
git add src/gallery/gallery.yaml src/data/galleryData.ts src/pages/collections src/seo/collectionMeta.ts src/seo/__tests__/collectionMeta.test.ts
git commit -m "Slugify collection URLs and give each route its own copy and metadata"
```

---

### Task 6: Sitemap and robots.txt

Runs after slugs are settled so the sitemap never contains a URL that is about to change.

**Files:**
- Modify: `astro.config.mts`
- Modify: `package.json` (dependency)
- Create: `public/robots.txt`

**Interfaces:**
- Consumes: the slugged routes from Task 5.
- Produces: `dist/sitemap-index.xml` and `dist/sitemap-0.xml`.

- [ ] **Step 1: Install the sitemap integration**

Run: `npm install --save-dev @astrojs/sitemap`

- [ ] **Step 2: Register it in `astro.config.mts`**

```ts
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://cedar4st.com',
	integrations: [sitemap()],
	vite: {
		plugins: [tailwindcss()],
	},
});
```

- [ ] **Step 3: Write `public/robots.txt`**

```
# Search engines: welcome.
User-agent: *
Allow: /

# AI training crawlers: the photographs are the product.
# Blocking Google-Extended does not affect Google Search or Google Images.
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: ClaudeBot
Disallow: /

Sitemap: https://cedar4st.com/sitemap-index.xml
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Then: `cat dist/robots.txt | head -3` — expected: the comment and `User-agent: *`.
Then: `grep -c '<loc>' dist/sitemap-0.xml` — expected: `17`.
Then: `grep -o '<loc>[^<]*</loc>' dist/sitemap-0.xml | grep -c '%20'` — expected: `0`. Any percent-encoded URL means Task 5 is incomplete; stop and fix it before continuing.

- [ ] **Step 5: Commit**

```bash
git add astro.config.mts package.json package-lock.json public/robots.txt
git commit -m "Generate a sitemap and add robots.txt"
```

---

### Task 7: Homepage content signals

The homepage currently contains neither "photographer" nor "Barcelona" in crawlable text; the parallax wall is a WebGL canvas, so its images are invisible to crawlers.

**Files:**
- Modify: `src/components/LandingHero-1.astro`
- Modify: `src/components/FeaturedGallery.astro:8-11`
- Create: `src/components/HomeIntro.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: nothing new.
- Produces: `HomeIntro.astro`, a props-free section component.

- [ ] **Step 1: Demote the joke heading and add the real `<h1>` in `LandingHero-1.astro`**

Change line 14 from an `<h1>` to a `<p>`, keeping every class so it renders identically:

```astro
<p class="text-4xl font-bold text-gray-900 md:text-5xl">good photo</p>
```

Then, immediately after the closing `</div>` of `#hero-card` and before the `<a href="/collections">`, insert:

```astro
<h1 class="mt-5 max-w-xl text-center text-base font-normal text-gray-700 md:text-lg">
	Hanna — documentary, event and wedding photographer in Barcelona.
</h1>
```

- [ ] **Step 2: Replace the filler subheading in `FeaturedGallery.astro`**

Replace the heading block with:

```astro
<div class="max-w-2xl mx-auto text-center mb-16">
	<h2 class="text-3xl md:text-4xl font-bold mb-4">Featured Works</h2>
	<p class="text-gray-600 italic">
		Selected work from weddings, events and documentary shoots across Barcelona.
	</p>
</div>
```

- [ ] **Step 3: Create `src/components/HomeIntro.astro`**

```astro
---
/**
 * Gives the homepage crawlable subject matter and internal links into the
 * collections. The parallax wall renders to a WebGL canvas, so without this the
 * page carries almost no indexable text.
 */
---

<section class="container-custom py-20">
	<div class="prose mx-auto max-w-2xl text-gray-700">
		<h2 class="text-2xl md:text-3xl font-bold">Photography in Barcelona</h2>

		<p>
			I photograph <a href="/collections/weddings/">weddings</a>, <a href="/collections/events/"
				>events</a
			> and <a href="/collections/activism/">documentary work</a> in Barcelona and wherever else the
			work takes me. My approach centres on raw emotion, genuine reaction, natural movement and
			minimal editing.
		</p>

		<p>
			That covers ceremonies and celebrations, corporate evenings and networking nights, sport,
			concerts and <a href="/collections/events/nightclub/">nightlife</a>, and long-form
			journalistic projects — Pride in Barcelona, protest movements in Mexico and Ukraine.
		</p>

		<p>
			There is also work I am actively building and shooting at reduced rates or TFP, including
			creative and conceptual shoots. <a href="/book/">The details are on the booking page.</a>
		</p>
	</div>
</section>
```

- [ ] **Step 4: Mount it in `src/pages/index.astro`**

Add the import alongside the others:

```astro
import HomeIntro from '../components/HomeIntro.astro';
```

And insert `<HomeIntro />` between the hero `</section>` and the `featured-section` section.

- [ ] **Step 5: Build and verify the homepage has real text**

Run: `npm run build`
Then: `grep -c -i 'barcelona' dist/index.html` — expected: 4 or more (was 0).
Then: `grep -o '<h1[^>]*>[^<]*</h1>' dist/index.html` — expected: the "documentary, event and wedding photographer in Barcelona" line.
Then: `grep -c '<h1' dist/index.html` — expected: `1`. More than one `<h1>` means Step 1 was applied incompletely.

- [ ] **Step 6: Check it visually**

Run `npm run preview` and confirm the hero card looks unchanged and the new line sits between the card and the "View Gallery" button without overlapping the parallax wall. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/components/LandingHero-1.astro src/components/FeaturedGallery.astro src/components/HomeIntro.astro src/pages/index.astro
git commit -m "Give the homepage crawlable subject matter"
```

---

### Task 8: TFP and reduced-rate section on the booking page

The mechanism by which shoot categories without galleries earn legitimate keyword coverage.

**Files:**
- Modify: `src/content/book.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Append the approved copy to `src/content/book.md`**

Add below the existing content, before the "separate photography project" line:

```markdown
### Work I'm looking for

There are kinds of photography I want to be doing more of, and I'd rather build that work with the right people than wait for it to find me. For the categories below I'm shooting at reduced rates, or TFP — time for prints, meaning you receive the edited images and neither of us invoices the other.

**Creative and conceptual shoots** are the ones I most want to make. This is the direction I'm actively trying to move in, and I'm looking for models and collaborators for it. If you've had an idea sitting unrealised, bring it — I'd rather make something strange with you than shoot another safe portrait.

I'm also building work in:

- Portrait and studio sessions
- Proposals and romantic sessions
- Backstage and behind-the-scenes
- Streetstyle
- Concerts and live music
- Property, interiors and Airbnb listings

Outside commissioned work I shoot landscape and night photography around Catalonia, mostly for myself.

If any of this is yours, write to me. Tell me what you want to make.
```

- [ ] **Step 2: Build and verify the terms are indexable**

Run: `npm run build`
Then:

```bash
for term in portrait studio proposal backstage streetstyle concert Airbnb creative landscape night TFP; do
  printf '%s: %s\n' "$term" "$(grep -c -i "$term" dist/book/index.html)"
done
```

Expected: every term returns 1 or more.

- [ ] **Step 3: Check the rendering**

Run `npm run preview`, open `/book/`, and confirm the list renders inside the `prose` column without breaking the two-column grid. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/content/book.md
git commit -m "Add the TFP and reduced-rate offer to the booking page"
```

---

### Task 9: Descriptive image alt text

242 images currently render `alt="Img 7348"`. This task adds the mechanism and the fallback; Task 10 supplies hand-written text for the 29 that matter most.

**Files:**
- Modify: `src/data/galleryData.ts` (the `Meta` and `Image` interfaces)
- Modify: `src/data/imageStore.ts`
- Modify: `src/components/PhotoGrid.astro:29`
- Modify: `src/data/galleryEntityFactory.ts:22-26`
- Test: `src/data/__tests__/imageStore.test.ts`

**Interfaces:**
- Consumes: `Collection`, `Meta` from `galleryData.ts`.
- Produces: `Image` gains a required `alt: string`; `Meta` gains an optional `alt?: string`.

- [ ] **Step 1: Write the failing test**

Append to the `describe('Get Images', ...)` block in `src/data/__tests__/imageStore.test.ts`:

```ts
it('prefers an explicit alt when one is set', async () => {
	const images = await getImages({ galleryPath: GALLERY.VALID, collection: 'popo' });
	expect(images[0].alt).toEqual('A view over popo valley at dusk');
});

it('derives a descriptive alt from the collection when none is set', async () => {
	const images = await getImages({ galleryPath: GALLERY.VALID, collection: 'kuku' });
	expect(images[0].alt).toEqual('Kuku — photography by Hanna, Barcelona');
});

it('never leaks a raw filename-style title into alt', async () => {
	const images = await getImages({ galleryPath: GALLERY.VALID });
	for (const image of images) {
		expect(image.alt).not.toMatch(/^Img \d+$/);
	}
});
```

Then add the explicit alt to the popo entry in `src/data/__tests__/gallery/valid-gallery.yaml`, inside its `meta:` block:

```yaml
      alt: A view over popo valley at dusk
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/data/__tests__/imageStore.test.ts`
Expected: FAIL — `alt` is undefined on the returned images.

- [ ] **Step 3: Extend the interfaces in `src/data/galleryData.ts`**

In `Meta`, add after `title`:

```ts
	/** Explicit alt text. Falls back to a collection-derived description. */
	alt?: string;
```

In `Image`, add after `title`:

```ts
	/** Resolved alt text. Never a raw filename. */
	alt: string;
```

- [ ] **Step 4: Resolve alt in `src/data/imageStore.ts`**

Add the resolver above `processImages`:

```ts
/**
 * Alt text, in order of preference: an explicit value, then a description
 * composed from the image's first real collection. Never the auto-generated
 * "Img 7348" title, which helps neither screen readers nor Google Images.
 */
const resolveAlt = (img: GalleryImage, collections: Collection[]): string => {
	if (img.meta.alt?.trim()) return img.meta.alt.trim();

	const collectionId = img.meta.collections.find((c) => !builtInCollections.includes(c));
	const name = collections.find((c) => c.id === collectionId)?.name;

	return name ? `${name} — photography by Hanna, Barcelona` : 'Photography by Hanna, Barcelona';
};
```

Thread the collections through. Change `processImages` and `createImageDataFor` signatures:

```ts
const processImages = (
	images: GalleryImage[],
	galleryPath: string,
	collections: Collection[],
): Image[] => {
	return images.reduce<Image[]>((acc, imageEntry) => {
		const imagePath = path.posix.join('/', path.parse(galleryPath).dir, imageEntry.path);
		try {
			acc.push(createImageDataFor(imagePath, imageEntry, collections));
		} catch (error) {
			console.warn(`[WARN] ${getErrorMsgFrom(error)}`);
		}
		return acc;
	}, []);
};

const createImageDataFor = (
	imagePath: string,
	img: GalleryImage,
	collections: Collection[],
): Image => {
	const imageModule = imageModules[imagePath] as ImageModule | undefined;

	if (!imageModule) {
		throw new ImageStoreError(`Image not found: ${imagePath}`);
	}

	return {
		src: imageModule.default,
		title: img.meta.title,
		alt: resolveAlt(img, collections),
		description: img.meta.description,
		collections: img.meta.collections,
	};
};
```

In `getImages`, keep the loaded gallery so its collections can be passed down:

```ts
	try {
		const gallery = await loadGalleryData(galleryPath);
		let images = gallery.images;
		images = filterImagesByCollection(collection, images);
		images = sortImages(images, options);
		return processImages(images, galleryPath, gallery.collections);
	} catch (error) {
```

- [ ] **Step 5: Use it in `src/components/PhotoGrid.astro`**

Change `alt={image.title}` to `alt={image.alt}`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, including the three new assertions.

- [ ] **Step 7: Stop the generator recreating the problem**

Newly imported images should surface as obviously-unfilled rather than silently
falling back forever. In `src/data/galleryEntityFactory.ts`, replace the `meta`
block at lines 22-26:

```ts
		meta: {
			title: toReadableCaption(path.basename(relativePath, path.extname(relativePath))),
			// Left blank on purpose: an empty alt is a visible prompt to write one,
			// and imageStore falls back to a collection-derived description meanwhile.
			alt: '',
			description: '',
			collections: collectionIdForImage(relativePath),
		},
```

- [ ] **Step 8: Build and verify**

Run: `npm run build`
Then: `grep -c 'alt="Img ' dist/index.html` — expected: `0`.

- [ ] **Step 9: Commit**

```bash
git add src/data src/components/PhotoGrid.astro
git commit -m "Resolve descriptive image alt text instead of filenames"
```

---

### Task 10: Hand-written alt text for the featured images

The 29 `featured` images appear on the homepage and carry the most weight. This is data entry that requires looking at each photograph, so it is deliberately separated from the mechanism in Task 9.

**Files:**
- Modify: `src/gallery/gallery.yaml` (the `images:` block, `featured` entries only)

**Interfaces:**
- Consumes: the optional `Meta.alt` field from Task 9.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: List the featured images**

```bash
grep -B 8 '^        - featured$' src/gallery/gallery.yaml | grep '^  - path:' | sed 's/^  - path: //'
```

Expected: 29 paths.

- [ ] **Step 2: View each image and write its alt text**

For each path, read the file at `src/gallery/<path>` and write one line describing what is actually visible.

Rules:
- Describe the photograph, not the keyword. "Two dancers lit by a red strobe in a Barcelona club" is good; "Barcelona nightlife photographer photography" is keyword stuffing and will be treated as such.
- 8–16 words. No "image of" or "photo of" — the element is already an image.
- Include a place name only when it is genuinely identifiable in the frame.
- Do not name identifiable private individuals.

Worked examples, matching the required YAML shape:

```yaml
  - path: events/nightclub/IMG_7348.webp
    meta:
      title: Img 7348
      alt: Dancers lit by red strobe on a crowded Barcelona club floor
      description: ''
      collections:
        - events/nightclub
        - featured
    exif: {}
  - path: activism/Barcelona Pride/pride - 051.webp
    meta:
      title: Pride 051
      alt: Marchers carrying a rainbow banner through central Barcelona at Pride
      description: ''
      collections:
        - activism/Barcelona Pride
        - featured
    exif: {}
```

- [ ] **Step 3: Verify all 29 are filled and unique**

```bash
grep -c '^      alt: ' src/gallery/gallery.yaml
```

Expected: `29`.

```bash
grep '^      alt: ' src/gallery/gallery.yaml | sort | uniq -d
```

Expected: no output. Duplicates mean two photographs got the same description.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Then: `grep -o 'alt="[^"]*"' dist/index.html | sort -u | head -30` — spot-check that the strings describe photographs.

- [ ] **Step 5: Commit**

```bash
git add src/gallery/gallery.yaml
git commit -m "Write alt text for the featured images"
```

---

### Task 11: i18n structure and hreflang

Configures the URL structure so Spanish is later a content task rather than a URL migration. No Spanish content ships here.

**Files:**
- Modify: `astro.config.mts`
- Create: `src/seo/hreflang.ts`
- Test: `src/seo/__tests__/hreflang.test.ts`
- Modify: `src/layouts/MainLayout.astro`

**Interfaces:**
- Consumes: `LOCALES`, `DEFAULT_LOCALE`, `SITE`, `type Locale` from `defaults.ts`; `canonicalFor` from `meta.ts`.
- Produces: `alternates(path: string, availableLocales: Locale[]): Alternate[]` where `Alternate = { hreflang: string; href: string }`.

- [ ] **Step 1: Write the failing test**

Create `src/seo/__tests__/hreflang.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SITE } from '../defaults.ts';
import { alternates } from '../hreflang.ts';

describe('alternates', () => {
	it('emits nothing when only the default locale exists', () => {
		// A hreflang pointing at a page that does not exist is worse than none.
		expect(alternates('/book/', ['en'])).toEqual([]);
	});

	it('emits nothing for an empty locale list', () => {
		expect(alternates('/book/', [])).toEqual([]);
	});

	it('emits both locales plus x-default once Spanish exists', () => {
		expect(alternates('/book/', ['en', 'es'])).toEqual([
			{ hreflang: 'en', href: `${SITE}/book/` },
			{ hreflang: 'es', href: `${SITE}/es/book/` },
			{ hreflang: 'x-default', href: `${SITE}/book/` },
		]);
	});

	it('handles the root path', () => {
		expect(alternates('/', ['en', 'es'])).toEqual([
			{ hreflang: 'en', href: `${SITE}/` },
			{ hreflang: 'es', href: `${SITE}/es/` },
			{ hreflang: 'x-default', href: `${SITE}/` },
		]);
	});

	it('strips an existing locale prefix before rebuilding', () => {
		expect(alternates('/es/book/', ['en', 'es'])[0]).toEqual({
			hreflang: 'en',
			href: `${SITE}/book/`,
		});
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/seo/__tests__/hreflang.test.ts`
Expected: FAIL — cannot resolve `../hreflang.ts`.

- [ ] **Step 3: Write `src/seo/hreflang.ts`**

```ts
import { DEFAULT_LOCALE, LOCALES, type Locale } from './defaults.ts';
import { canonicalFor } from './meta.ts';

export interface Alternate {
	hreflang: string;
	href: string;
}

/** Removes a leading locale prefix so the bare path can be rebuilt per locale. */
const stripLocale = (path: string): string => {
	const trimmed = path.replace(/^\/+/, '');
	const [first, ...rest] = trimmed.split('/');
	return LOCALES.includes(first as Locale) && first !== DEFAULT_LOCALE
		? `/${rest.join('/')}`
		: `/${trimmed}`;
};

const localised = (bare: string, locale: Locale): string =>
	locale === DEFAULT_LOCALE ? canonicalFor(bare) : canonicalFor(`${locale}${bare}`);

/**
 * Alternate language URLs for a page.
 *
 * Returns an empty list unless the page genuinely exists in more than one
 * locale. Emitting hreflang for a URL that 404s reads to Google as a broken
 * site, so this stays dormant until Spanish content lands.
 */
export const alternates = (path: string, availableLocales: Locale[]): Alternate[] => {
	if (availableLocales.length < 2) return [];

	const bare = stripLocale(path);
	const links: Alternate[] = availableLocales.map((locale) => ({
		hreflang: locale,
		href: localised(bare, locale),
	}));

	links.push({ hreflang: 'x-default', href: localised(bare, DEFAULT_LOCALE) });
	return links;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/seo/__tests__/hreflang.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Configure i18n in `astro.config.mts`**

Add to the config object, after `site`:

```ts
	i18n: {
		locales: ['en', 'es'],
		defaultLocale: 'en',
		routing: { prefixDefaultLocale: false },
	},
```

- [ ] **Step 6: Render the tags in `MainLayout.astro`**

Add to the imports:

```ts
import { alternates } from '../seo/hreflang.ts';
import { DEFAULT_LOCALE, type Locale } from '../seo/defaults.ts';
```

Add to `Props`:

```ts
	/** Locales this page actually exists in. Defaults to English only. */
	availableLocales?: Locale[];
```

Destructure it with `availableLocales = [DEFAULT_LOCALE]` as the default, then compute and render:

```astro
const languageLinks = alternates(Astro.url.pathname, availableLocales);
```

```astro
		{
			languageLinks.map((link) => (
				<link rel="alternate" hreflang={link.hreflang} href={link.href} />
			))
		}
```

- [ ] **Step 7: Build and verify hreflang is dormant**

Run: `npm run build`
Then: `grep -c 'hreflang' dist/index.html` — expected: `0`, because only English exists. A non-zero count means tags are pointing at Spanish pages that do not exist.

- [ ] **Step 8: Commit**

```bash
git add astro.config.mts src/seo/hreflang.ts src/seo/__tests__/hreflang.test.ts src/layouts/MainLayout.astro
git commit -m "Configure i18n routing and dormant hreflang"
```

---

### Task 12: Remove dead weight, self-host Alpine, verify the parallax wall

**Files:**
- Delete: `public/hero-bg.webm`
- Modify: `src/layouts/MainLayout.astro` (the trailing script tag)
- Modify: `package.json`
- Verify only, do not modify: `src/components/ParallaxWall.astro`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Confirm the video really is unreferenced**

```bash
grep -rn 'hero-bg' src/ public/ astro.config.mts site.config.mts
```

Expected: no output. If anything matches, stop — it is in use.

- [ ] **Step 2: Delete it**

```bash
git rm public/hero-bg.webm
```

- [ ] **Step 3: Install Alpine as a dependency**

Run: `npm install alpinejs @types/alpinejs`

- [ ] **Step 4: Replace the CDN script in `MainLayout.astro`**

Replace the trailing `<script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>` with:

```astro
<script>
	import Alpine from 'alpinejs';

	window.Alpine = Alpine;
	Alpine.start();
</script>
```

Add the global type declaration to `src/env.d.ts`, creating the file if absent:

```ts
/// <reference types="astro/client" />

import type { Alpine } from 'alpinejs';

declare global {
	interface Window {
		Alpine: Alpine;
	}
}
```

- [ ] **Step 5: Verify the navigation still works**

Run `npm run build && npm run preview`. Narrow the window below the `md` breakpoint, open the mobile menu, and confirm it toggles. Scroll the homepage and confirm the navbar turns white. Both are Alpine-driven, so they are the regression test. Stop the server.

- [ ] **Step 6: Confirm the CDN reference is gone**

```bash
grep -rc 'unpkg.com' dist/index.html
```

Expected: `0`.

- [ ] **Step 7: Verify the parallax wall — do not change it**

The spec permits two targeted fixes to `ParallaxWall.astro`: deferring the WebGL
initialisation, and honouring `prefers-reduced-motion`. Inspection shows both are
already implemented — `prefers-reduced-motion` at line 77, and a dynamic
`three` import at line 91 so the library is never on the critical path.

This step confirms that and stops there. Do not refactor the component.

```bash
grep -n 'prefers-reduced-motion' src/components/ParallaxWall.astro
grep -n 'await import' src/components/ParallaxWall.astro
```

Expected: both return a match. If either does not, stop and report it rather
than implementing a fix — the spec requires measuring before changing this
component.

Then confirm three.js is genuinely split out of the initial bundle:

```bash
npm run build
grep -o 'src="/_astro/[^"]*"' dist/index.html
ls -S dist/_astro/*.js | head -3
```

Expected: the largest chunk (three.js, roughly 600 KB) is **not** among the
scripts referenced directly by `dist/index.html`. If it is, the dynamic import
is not taking effect — record the finding for a future task and do not fix it
here.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Delete the unused hero video and bundle Alpine"
```

---

### Task 13: Cookieless analytics

**Blocked on the owner supplying a Cloudflare Web Analytics site token.** If it is not available, skip this task and return to it — nothing else depends on it.

**Files:**
- Modify: `site.config.mts`
- Modify: `src/layouts/MainLayout.astro`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Add the token to `site.config.mts`**

Inside the default-exported object:

```ts
	/** Cloudflare Web Analytics site token. Empty disables the beacon. */
	analyticsToken: '',
```

- [ ] **Step 2: Render the beacon conditionally in `MainLayout.astro`**

Add `const analyticsToken = siteConfig.analyticsToken;` to the frontmatter, and place before `</body>`:

```astro
		{
			analyticsToken && (
				<script
					defer
					src="https://static.cloudflareinsights.com/beacon.min.js"
					data-cf-beacon={`{"token": "${analyticsToken}"}`}
				/>
			)
		}
```

- [ ] **Step 3: Verify it stays absent while the token is empty**

Run: `npm run build`
Then: `grep -c 'cloudflareinsights' dist/index.html` — expected: `0`.

- [ ] **Step 4: Paste in the real token and rebuild**

Set `analyticsToken` to the value from the Cloudflare dashboard, run `npm run build`, and confirm `grep -c 'cloudflareinsights' dist/index.html` returns `1`.

- [ ] **Step 5: Commit**

```bash
git add site.config.mts src/layouts/MainLayout.astro
git commit -m "Add cookieless Cloudflare Web Analytics"
```

---

### Task 14: Guard against the regression that started all this

Duplicate titles are the exact failure mode the site is in today, and they return silently. This adds a check that runs against the built output.

**Files:**
- Create: `scripts/check-seo.ts`
- Modify: `package.json` (scripts)
- Modify: `.github/workflows/test.yml`

**Interfaces:**
- Consumes: `dist/**/*.html`.
- Produces: `npm run seo:check`, exiting non-zero on any violation.

- [ ] **Step 1: Write `scripts/check-seo.ts`**

```ts
/**
 * Post-build SEO assertions.
 *
 * Runs against dist/ rather than as a unit test, because the thing worth
 * checking is the rendered output of every route, not any one function.
 */
import { promises as fs } from 'fs';
import fg from 'fast-glob';

interface PageMeta {
	file: string;
	title: string;
	description: string;
	canonical: string;
	h1Count: number;
}

const extract = (html: string, pattern: RegExp): string => html.match(pattern)?.[1]?.trim() ?? '';

const read = async (file: string): Promise<PageMeta> => {
	const html = await fs.readFile(file, 'utf8');
	return {
		file,
		title: extract(html, /<title>([^<]*)<\/title>/),
		description: extract(html, /<meta name="description" content="([^"]*)"/),
		canonical: extract(html, /<link rel="canonical" href="([^"]*)"/),
		h1Count: (html.match(/<h1[\s>]/g) ?? []).length,
	};
};

const duplicates = (pages: PageMeta[], key: 'title' | 'description'): string[] => {
	const seen = new Map<string, string[]>();
	for (const page of pages) {
		seen.set(page[key], [...(seen.get(page[key]) ?? []), page.file]);
	}
	return [...seen.entries()]
		.filter(([, files]) => files.length > 1)
		.map(([value, files]) => `  ${key} "${value}" shared by:\n${files.map((f) => `    ${f}`).join('\n')}`);
};

const main = async () => {
	const files = await fg('dist/**/*.html');
	if (files.length === 0) {
		console.error('No HTML found in dist/. Run `npm run build` first.');
		process.exit(1);
	}

	const pages = await Promise.all(files.map(read));
	const problems: string[] = [];

	for (const page of pages) {
		if (!page.title) problems.push(`  missing title: ${page.file}`);
		if (!page.description) problems.push(`  missing description: ${page.file}`);
		if (!page.canonical) problems.push(`  missing canonical: ${page.file}`);
		if (page.h1Count !== 1) problems.push(`  ${page.h1Count} h1 elements: ${page.file}`);
		if (/alt="Img \d+"/.test(page.title)) problems.push(`  filename-style title: ${page.file}`);
	}

	problems.push(...duplicates(pages, 'title'), ...duplicates(pages, 'description'));

	if (problems.length > 0) {
		console.error(`SEO check failed across ${pages.length} pages:\n${problems.join('\n')}`);
		process.exit(1);
	}

	console.log(`SEO check passed: ${pages.length} pages, all unique.`);
};

main();
```

- [ ] **Step 2: Add the script to `package.json`**

In `scripts`, after `"build"`:

```json
		"seo:check": "npx tsx scripts/check-seo.ts",
```

- [ ] **Step 3: Run it against the current build**

Run: `npm run build && npm run seo:check`
Expected: `SEO check passed: 17 pages, all unique.`

If it fails, the failure is real — fix the page it names rather than loosening the check.

- [ ] **Step 4: Prove it catches the original bug**

Temporarily set both `index.astro` and `book.astro` to `title="Hanna"`, run `npm run build && npm run seo:check`, and confirm it exits non-zero naming both files. Revert the change.

- [ ] **Step 5: Wire it into CI**

In `.github/workflows/test.yml`, in the `build` job, after the "Build the Astro site" step:

```yaml
      - name: Check SEO invariants
        run: npm run seo:check
```

- [ ] **Step 6: Commit**

```bash
git add scripts/check-seo.ts package.json .github/workflows/test.yml
git commit -m "Fail the build on duplicate or missing page metadata"
```

---

### Task 15: Verification files and submission

The final step, and the one that requires the owner. Everything before this is reversible; submission is when the site becomes visible.

**Files:**
- Create: `public/google<verification-code>.html` (name supplied by Search Console)
- Create: `public/BingSiteAuth.xml` (only if the Search Console import is not used)

- [ ] **Step 1: Confirm the site is ready**

```bash
npm run build && npm run seo:check
grep -o '<loc>[^<]*</loc>' dist/sitemap-0.xml | grep -c '%20'
```

Expected: the check passes and the percent-encoding count is `0`.

- [ ] **Step 2: Merge and deploy**

```bash
git checkout main
git merge seo-foundation
git push
```

Watch `.github/workflows/deploy.yml` complete, then confirm `https://cedar4st.com/robots.txt` and `https://cedar4st.com/sitemap-index.xml` both resolve.

- [ ] **Step 3: Verify in Google Search Console**

Create the property for `https://cedar4st.com`, choose HTML file verification, place the supplied file in `public/`, commit, push, wait for deploy, then verify.

- [ ] **Step 4: Submit the sitemap**

In Search Console, submit `sitemap-index.xml`. Request indexing for the homepage, `/book/`, and `/collections/`.

- [ ] **Step 5: Connect Bing Webmaster Tools**

Create the account and import the Search Console property, which carries verification across. Confirm the sitemap appears.

- [ ] **Step 6: Commit the verification file**

```bash
git add public/
git commit -m "Add search engine verification files"
```

---

## After this plan

Phase 2 gets its own spec. The first thing to do is nothing: let Search Console
accumulate four to six weeks of query data. What people actually search to reach
the site determines which service pages get written first and which pages are
worth translating into Spanish — both of which are currently guesses.

Google Business Profile remains deliberately deferred per the spec, but its
verification carries a lead time of days to weeks and is independent of all
website work, so the request can be submitted whenever the owner chooses.
