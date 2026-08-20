# Spanish Localisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship all 17 pages of cedar4st.com in Spanish at `/es/…`, with hreflang, sitemap alternates and a language switcher, without altering a single byte of the English output until the final activation task.

**Architecture:** Page markup lives once in locale-aware components that derive their locale from `Astro.url.pathname`; `/es/` routes are thin wrappers. UI strings live in typed dictionaries (`src/i18n/en.ts`, `es.ts`) where a missing key is a compile error. Collection copy stays colocated with its English original in `gallery.yaml` and the route's `SYNTHETIC` array under a nested `es:` block.

**Tech Stack:** Astro 5.8.1 (static, `build.format: 'directory'`), TypeScript, Tailwind 4, vitest, ESLint (type-aware), Prettier (tabs, single quotes, 100 cols), `@astrojs/sitemap`.

**Spec:** `docs/superpowers/specs/2026-08-20-spanish-localisation-design.md`

## Global Constraints

- **Formatting:** tabs for indentation, single quotes, 100-column print width. Run `npm run prettier` before committing.
- **Imports:** relative imports of local TS modules carry an explicit `.ts` extension (`from './defaults.ts'`). Match the surrounding files.
- **Test location:** `src/<dir>/__tests__/<name>.test.ts`. Run with `npx vitest run`.
- **Lint:** `npm run lint` must pass. `tsconfig.json` already includes `src/**/*` and `scripts/**/*`; do not add ignores to make lint pass.
- **URLs:** every route is served with a trailing slash (`build.format: 'directory'`). Canonicals and generated links must agree.
- **Title suffix:** ` — Cedar4st`, applied by `composeTitle()`. Never hardcode it.
- **URL slugs stay English in both locales** — `/es/collections/weddings/`, never `/es/colecciones/bodas/`. (Spec Decision 4.)
- **Spanish uses *fotógrafa*** — feminine, consistently, in prose, headings and meta. (Spec Decision 5.)
- **English output must not change** until Task 10. Tasks 1–9 are verified partly by the English HTML being unchanged.
- **Locale values** are exactly `'en'` and `'es'`, from `LOCALES` in `src/seo/defaults.ts`. Do not introduce `'es-ES'` as a locale key; it appears only as an `og:locale` value.

---

### Task 1: i18n core — types, dictionaries, locale helpers

Creates the typed string contract and the two path helpers everything else builds on. No component consumes it yet, so English output is untouched.

**Files:**
- Create: `src/i18n/types.ts`
- Create: `src/i18n/en.ts`
- Create: `src/i18n/es.ts`
- Create: `src/i18n/index.ts`
- Test: `src/i18n/__tests__/i18n.test.ts`

**Interfaces:**
- Consumes: `Locale`, `LOCALES`, `DEFAULT_LOCALE` from `src/seo/defaults.ts`
- Produces:
  - `interface Strings` (shape below)
  - `useTranslations(locale: Locale): Strings`
  - `localeFromPath(pathname: string): Locale`
  - `localePath(path: string, locale: Locale): string`

- [ ] **Step 1: Write the failing test**

Create `src/i18n/__tests__/i18n.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { localeFromPath, localePath, useTranslations } from '../index.ts';
import en from '../en.ts';
import es from '../es.ts';

describe('localeFromPath', () => {
	it('reads Spanish from an /es/ prefix', () => {
		expect(localeFromPath('/es/')).toBe('es');
		expect(localeFromPath('/es/book/')).toBe('es');
		expect(localeFromPath('/es/collections/weddings/')).toBe('es');
	});

	it('defaults to English for unprefixed paths', () => {
		expect(localeFromPath('/')).toBe('en');
		expect(localeFromPath('/book/')).toBe('en');
	});

	it('does not mistake a path segment that merely starts with es', () => {
		expect(localeFromPath('/essays/')).toBe('en');
		expect(localeFromPath('/collections/espana/')).toBe('en');
	});
});

describe('localePath', () => {
	it('leaves English paths alone', () => {
		expect(localePath('/book/', 'en')).toBe('/book/');
		expect(localePath('/', 'en')).toBe('/');
	});

	it('prefixes Spanish paths', () => {
		expect(localePath('/book/', 'es')).toBe('/es/book/');
		expect(localePath('/', 'es')).toBe('/es/');
	});

	it('is idempotent — never double-prefixes', () => {
		expect(localePath('/es/book/', 'es')).toBe('/es/book/');
	});

	it('strips a locale prefix when switching back to English', () => {
		expect(localePath('/es/book/', 'en')).toBe('/book/');
		expect(localePath('/es/', 'en')).toBe('/');
	});
});

describe('dictionaries', () => {
	it('returns the requested locale', () => {
		expect(useTranslations('en')).toBe(en);
		expect(useTranslations('es')).toBe(es);
	});

	// Backstop for anything the type system cannot see, e.g. a key deleted
	// from both files at once, or an object built dynamically.
	it('has identical key sets in both locales', () => {
		const keys = (value: unknown, prefix = ''): string[] =>
			value !== null && typeof value === 'object' && !Array.isArray(value)
				? Object.entries(value).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
				: [prefix.replace(/\.$/, '')];

		expect(keys(es).sort()).toEqual(keys(en).sort());
	});

	it('has no untranslated strings left in Spanish', () => {
		expect(es.nav.home).not.toBe(en.nav.home);
		expect(es.buttons.viewGallery).not.toBe(en.buttons.viewGallery);
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/i18n/__tests__/i18n.test.ts`
Expected: FAIL — cannot resolve `../index.ts`.

- [ ] **Step 3: Write `src/i18n/types.ts`**

```ts
/**
 * The contract between locales.
 *
 * `es.ts` is typed as `Strings`, so a forgotten key is a compile error rather
 * than an English word rendered on a Spanish page.
 *
 * Paragraph fields hold HTML because they contain inline links, and each
 * locale carries its own already-correct hrefs — the Spanish copy links to
 * /es/collections/…, so no rewriting happens at render time.
 */
export interface Strings {
	nav: {
		home: string;
		gallery: string;
		book: string;
		/** Accessible label for the language switcher. */
		language: string;
	};
	hero: {
		word: string;
		partOfSpeech: string;
		countable: string;
		ipa: string;
		definition: string;
		attribution: string;
		viewGallery: string;
	};
	home: {
		introHeading: string;
		/** HTML; rendered with set:html. */
		paragraphs: string[];
	};
	featured: {
		works: string;
		work: string;
	};
	gallery: {
		/** The chip that clears all filters. */
		all: string;
		/** Parent chip. `{name}` is replaced with the parent's display name. */
		allOf: string;
		/** Breadcrumb label for the collections index. */
		breadcrumb: string;
	};
	book: {
		heading: string;
		bookService: string;
		bookEmail: string;
		bookConsultation: string;
		profileAlt: string;
	};
	meta: {
		home: { title: string; description: string };
		book: { title: string; description: string };
	};
}
```

- [ ] **Step 4: Write `src/i18n/en.ts`**

Every value here is copied verbatim from the component it currently lives in, so English output cannot shift.

```ts
import type { Strings } from './types.ts';

const en: Strings = {
	nav: { home: 'Home', gallery: 'Gallery', book: 'Book', language: 'Language' },
	hero: {
		word: 'good photo',
		partOfSpeech: 'noun',
		countable: '[ countable ]',
		ipa: '/ˈfəʊtəʊ/',
		definition: 'evidence that you were, briefly, photogenic.',
		attribution: 'Hanna — documentary, event and wedding photographer in Barcelona',
		viewGallery: 'View Gallery',
	},
	home: {
		introHeading: 'Photography in Barcelona',
		paragraphs: [
			'I photograph <a href="/collections/weddings/">weddings</a>, <a href="/collections/events/">events</a> and <a href="/collections/activism/">documentary work</a> in Barcelona and wherever else the work takes me. My approach centers on raw emotion, genuine reaction, natural movement and minimal editing.',
			'That covers ceremonies and celebrations, corporate evenings and networking nights, sport, concerts and <a href="/collections/events/nightclub/">nightlife</a>, and long-form journalistic projects — Pride in Barcelona, an immigration-rights protest by Houston\'s Mexican community, and a memorial held by Houston\'s Ukrainian community on the anniversary of the war.',
			'I work in English and Spanish, and much of my client work in Barcelona is with visitors and people who have recently moved here. I travel for commissions — the documentary and event work below was photographed in Barcelona, on the Costa Brava, and in Houston, Texas.',
			'There is also work I am actively building and shooting at reduced rates or TFP, including creative and conceptual shoots. <a href="/book/">The details are on the booking page.</a>',
		],
	},
	featured: { works: 'Featured Works', work: 'Featured Work' },
	gallery: { all: 'All', allOf: 'All {name}', breadcrumb: 'Gallery' },
	book: {
		heading: 'Book Me',
		bookService: 'Book my service',
		bookEmail: 'Book through Email',
		bookConsultation: 'Book a consultation',
		profileAlt: 'Hanna editing a photograph in DaVinci Resolve',
	},
	meta: {
		home: {
			title: 'Photographer in Barcelona',
			description:
				'Hanna is a documentary, event and wedding photographer based in Barcelona. Weddings, nightlife, concerts, sport and journalistic work.',
		},
		book: {
			title: 'Book a Photographer in Barcelona',
			description:
				'Book Hanna for weddings, events, portraits and documentary work in Barcelona. Reduced rates and TFP available for selected shoot types.',
		},
	},
};

export default en;
```

- [ ] **Step 5: Write `src/i18n/es.ts`**

Hero definition and page copy are finalised in Task 6; these are working drafts so the file type-checks from the start.

```ts
import type { Strings } from './types.ts';

const es: Strings = {
	nav: { home: 'Inicio', gallery: 'Galería', book: 'Reservar', language: 'Idioma' },
	hero: {
		word: 'buena foto',
		partOfSpeech: 'sustantivo',
		countable: '[ contable ]',
		ipa: '/ˈbwena ˈfoto/',
		definition: 'prueba de que, por un instante, saliste bien.',
		attribution: 'Hanna — fotógrafa de bodas, eventos y documental en Barcelona',
		viewGallery: 'Ver galería',
	},
	home: {
		introHeading: 'Fotografía en Barcelona',
		paragraphs: [
			'Fotografío <a href="/es/collections/weddings/">bodas</a>, <a href="/es/collections/events/">eventos</a> y <a href="/es/collections/activism/">trabajo documental</a> en Barcelona y allá donde me lleve el encargo. Trabajo con la emoción real, la reacción genuina, el movimiento natural y una edición mínima.',
			'Eso incluye ceremonias y celebraciones, cenas de empresa y noches de networking, deporte, conciertos y <a href="/es/collections/events/nightclub/">vida nocturna</a>, además de proyectos periodísticos de largo recorrido: el Orgullo en Barcelona, una protesta por los derechos de los inmigrantes de la comunidad mexicana de Houston y un homenaje de la comunidad ucraniana de Houston en el aniversario de la guerra.',
			'Trabajo en español y en inglés, y buena parte de mis encargos en Barcelona son con visitantes y con personas que acaban de mudarse aquí. Viajo para trabajar: el trabajo documental y de eventos que verás abajo se fotografió en Barcelona, en la Costa Brava y en Houston, Texas.',
			'También hay trabajo que estoy construyendo ahora mismo, con tarifas reducidas o en TFP, incluidas sesiones creativas y conceptuales. <a href="/es/book/">Tienes los detalles en la página de reservas.</a>',
		],
	},
	featured: { works: 'Trabajos destacados', work: 'Trabajo destacado' },
	gallery: { all: 'Todo', allOf: 'Todo en {name}', breadcrumb: 'Galería' },
	book: {
		heading: 'Reserva conmigo',
		bookService: 'Reservar mi servicio',
		bookEmail: 'Reservar por correo',
		bookConsultation: 'Reservar una consulta',
		profileAlt: 'Hanna editando una fotografía en DaVinci Resolve',
	},
	meta: {
		home: {
			title: 'Fotógrafa en Barcelona',
			description:
				'Hanna es fotógrafa de bodas, eventos y documental en Barcelona. Bodas, vida nocturna, conciertos, deporte y trabajo periodístico.',
		},
		book: {
			title: 'Reservar fotógrafa en Barcelona',
			description:
				'Reserva a Hanna para bodas, eventos, retratos y trabajo documental en Barcelona. Tarifas reducidas y TFP para sesiones seleccionadas.',
		},
	},
};

export default es;
```

- [ ] **Step 6: Write `src/i18n/index.ts`**

```ts
import { DEFAULT_LOCALE, LOCALES, type Locale } from '../seo/defaults.ts';
import type { Strings } from './types.ts';
import en from './en.ts';
import es from './es.ts';

const DICTIONARIES: Record<Locale, Strings> = { en, es };

export const useTranslations = (locale: Locale): Strings => DICTIONARIES[locale];

/**
 * Locale implied by a URL path.
 *
 * Matches on a whole first segment, so /essays/ is English rather than a
 * mangled Spanish route.
 */
export const localeFromPath = (pathname: string): Locale => {
	const first = pathname.replace(/^\/+/, '').split('/')[0];
	return LOCALES.includes(first as Locale) && first !== DEFAULT_LOCALE
		? (first as Locale)
		: DEFAULT_LOCALE;
};

/**
 * The same page in a given locale.
 *
 * Idempotent: an already-prefixed path passed for its own locale comes back
 * unchanged, so callers never have to know whether a path is bare.
 */
export const localePath = (path: string, locale: Locale): string => {
	const bare = path.replace(/^\/+/, '');
	const segments = bare.split('/');
	const stripped =
		LOCALES.includes(segments[0] as Locale) && segments[0] !== DEFAULT_LOCALE
			? segments.slice(1).join('/')
			: bare;

	return locale === DEFAULT_LOCALE ? `/${stripped}` : `/${locale}/${stripped}`;
};

export type { Strings } from './types.ts';
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/i18n/__tests__/i18n.test.ts`
Expected: PASS, all cases.

- [ ] **Step 8: Confirm English output is byte-identical**

```bash
npm run build && cp -r dist /tmp/baseline-en
```

Keep `/tmp/baseline-en` — Tasks 2, 3 and 4 diff against it.

- [ ] **Step 9: Lint, format, commit**

```bash
npm run prettier && npm run lint
git add src/i18n
git commit -m "Add typed i18n dictionaries and locale path helpers

Nothing consumes them yet. es.ts is typed as Strings, so a missing key is a
compile error rather than an English word on a Spanish page."
```

---

### Task 2: Locale-aware MainLayout

Teaches the layout to render the right `lang`, `og:locale` and `inLanguage`. Because every page is still English, the rendered output must not change except for `og:locale`, which is a bug fix.

**Files:**
- Create: `src/seo/ogLocale.ts`
- Test: `src/seo/__tests__/ogLocale.test.ts`
- Modify: `src/layouts/MainLayout.astro:21-30` and the `og:locale` meta tag
- Modify: `src/seo/schema.ts` — add `inLanguage` to both node builders

**Interfaces:**
- Consumes: `localeFromPath` (Task 1), `Locale` from `src/seo/defaults.ts`
- Produces: `ogLocale(locale: Locale): string`; `professionalService(locale?: Locale)` and `person(locale?: Locale)` gain an optional trailing parameter defaulting to `DEFAULT_LOCALE`

- [ ] **Step 1: Write the failing test**

Create `src/seo/__tests__/ogLocale.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ogLocale } from '../ogLocale.ts';

describe('ogLocale', () => {
	it('maps bare locales to the territory form Open Graph expects', () => {
		expect(ogLocale('en')).toBe('en_US');
		expect(ogLocale('es')).toBe('es_ES');
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/seo/__tests__/ogLocale.test.ts`
Expected: FAIL — cannot resolve `../ogLocale.ts`.

- [ ] **Step 3: Write `src/seo/ogLocale.ts`**

```ts
import type { Locale } from './defaults.ts';

/**
 * Open Graph wants language_TERRITORY, not a bare language code. Facebook
 * ignores `en` and falls back to its own guess, so this is a fix rather than
 * a localisation feature.
 *
 * es_ES is peninsular Spanish, which matches a Barcelona-based business.
 */
const OG_LOCALES: Record<Locale, string> = { en: 'en_US', es: 'es_ES' };

export const ogLocale = (locale: Locale): string => OG_LOCALES[locale];
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/seo/__tests__/ogLocale.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `inLanguage` to the schema builders**

In `src/seo/schema.ts`, change the two exported builders to accept a locale. Add the import `DEFAULT_LOCALE, type Locale` from `./defaults.ts` alongside the existing `SITE` import.

```ts
export const professionalService = (locale: Locale = DEFAULT_LOCALE): JsonLd => {
	// ...existing body unchanged, plus this key in the returned object:
	//   inLanguage: locale,
};

export const person = (locale: Locale = DEFAULT_LOCALE): JsonLd => ({
	// ...existing body unchanged, plus:
	//   inLanguage: locale,
});
```

Do NOT change `BUSINESS_ID` or `PERSON_ID`. Their stability across locales is what stops Google reading one photographer as two businesses — see the spec's Risks section.

- [ ] **Step 6: Extend the schema test**

Append to `src/seo/__tests__/schema.test.ts`:

```ts
describe('locale handling', () => {
	it('defaults to English', () => {
		expect(professionalService().inLanguage).toBe('en');
		expect(person().inLanguage).toBe('en');
	});

	it('carries the requested locale', () => {
		expect(professionalService('es').inLanguage).toBe('es');
		expect(person('es').inLanguage).toBe('es');
	});

	it('keeps @id stable across locales so the entity is not duplicated', () => {
		expect(professionalService('es')['@id']).toBe(professionalService('en')['@id']);
		expect(person('es')['@id']).toBe(person('en')['@id']);
	});
});
```

Add `professionalService`, `person` to the file's existing import if absent.

- [ ] **Step 7: Wire MainLayout**

In `src/layouts/MainLayout.astro`, add to the imports:

```astro
import { localeFromPath } from '../i18n/index.ts';
import { ogLocale } from '../seo/ogLocale.ts';
```

Replace the frontmatter derivation block (currently lines 21–27) with:

```astro
const { title, description, image, jsonLd = [], availableLocales = [DEFAULT_LOCALE] } = Astro.props;
const favicon = siteConfig.favicon;
const analyticsToken = siteConfig.analyticsToken;

const locale = localeFromPath(Astro.url.pathname);
const meta = buildMeta({ title, description, image, path: Astro.url.pathname, locale });
const structuredData: JsonLd[] = [professionalService(locale), person(locale), ...jsonLd];
const languageLinks = alternates(Astro.url.pathname, availableLocales);
```

Change the opening tag to `<html lang={locale} class="h-full">` and the Open Graph tag to:

```astro
<meta property="og:locale" content={ogLocale(meta.og.locale)} />
```

- [ ] **Step 8: Verify the only English change is the og:locale fix**

```bash
npm run build
diff -r /tmp/baseline-en dist | head -40
```

Expected: differences confined to `og:locale` changing `en` → `en_US`, and `inLanguage` appearing in the JSON-LD. Any other difference is a regression — stop and fix.

- [ ] **Step 9: Full check and commit**

```bash
npx vitest run && npm run seo:check && npm run prettier && npm run lint
git add src/seo/ogLocale.ts src/seo/__tests__ src/seo/schema.ts src/layouts/MainLayout.astro
git commit -m "Make MainLayout locale-aware and fix og:locale

og:locale emitted a bare 'en' where Open Graph expects language_TERRITORY;
Facebook ignored it. Locale is derived from the URL rather than threaded
through every page as a prop, so it cannot be forgotten at a call site.

@id stays stable across locales deliberately: it is what stops one
photographer being indexed as two competing businesses."
```

---

### Task 3: Extract the collections route into a shared module

Pure refactor. The English collections pages must render byte-identically; the point is that `/es/` can reuse this logic in Task 7 rather than owning a second copy of the slug map and the unmapped-slug guard.

**Files:**
- Create: `src/collections/route.ts`
- Create: `src/components/CollectionPage.astro`
- Test: `src/collections/__tests__/route.test.ts`
- Modify: `src/pages/collections/[...collection].astro` — becomes a thin wrapper

**Interfaces:**
- Consumes: `getCollections`, `getImages` from `src/data/imageStore`; `collectionMeta`; `buildSlugMap`, `slugifyId`; `breadcrumbList`, `type Crumb`
- Produces:
  - `SYNTHETIC: Collection[]`
  - `buildTree(ids: string[]): Node`
  - `collectionPaths(): Promise<{ params: { collection: string | undefined } }[]>`
  - `resolveCollection(slug: string | undefined, collections: Collection[]): string | undefined` — throws on an unmapped slug
  - `filterRows(tree: Node, activeSegments: string[], allLabel: string, allOfLabel: string): Row[]`
  - `type Row = { parentId?: string; parentName: string; items: { id: string; name: string }[]; activeId?: string }`

- [ ] **Step 1: Write the failing test**

Create `src/collections/__tests__/route.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildTree, filterRows, resolveCollection, SYNTHETIC } from '../route.ts';
import type { Collection } from '../../data/galleryData.ts';

const COLLECTIONS: Collection[] = [
	{ id: 'weddings', name: 'Weddings' },
	{ id: 'events/nightclub', name: 'Events Nightclub' },
	{ id: 'events/networking/pitch deck', name: 'Events Networking Pitch Deck' },
];

describe('resolveCollection', () => {
	it('maps a slug back to its id', () => {
		expect(resolveCollection('weddings', COLLECTIONS)).toBe('weddings');
		expect(resolveCollection('events/networking/pitch-deck', COLLECTIONS)).toBe(
			'events/networking/pitch deck',
		);
	});

	it('returns undefined for the index route', () => {
		expect(resolveCollection(undefined, COLLECTIONS)).toBeUndefined();
	});

	it('throws on a slug with no id, naming the likely cause', () => {
		expect(() => resolveCollection('does-not-exist', COLLECTIONS)).toThrow(/SYNTHETIC/);
	});
});

describe('buildTree', () => {
	it('synthesises intermediate nodes from id paths', () => {
		const tree = buildTree(COLLECTIONS.map((c) => c.id));
		expect([...tree.children.keys()].sort()).toEqual(['events', 'weddings']);
		expect(tree.children.get('events')!.children.has('networking')).toBe(true);
	});
});

describe('filterRows', () => {
	it('offers a parent escape chip on nested rows only', () => {
		const tree = buildTree(COLLECTIONS.map((c) => c.id));
		const rows = filterRows(tree, ['events'], 'All', 'All {name}');
		expect(rows[0].items.some((i) => i.name === 'All Events')).toBe(false);
		expect(rows[1].items.some((i) => i.name === 'All Events')).toBe(true);
	});

	it('substitutes the label template rather than hardcoding English', () => {
		const tree = buildTree(COLLECTIONS.map((c) => c.id));
		const rows = filterRows(tree, ['events'], 'Todo', 'Todo en {name}');
		expect(rows[1].items.some((i) => i.name === 'Todo en Events')).toBe(true);
	});
});

describe('SYNTHETIC', () => {
	it('covers every intermediate node the tree can produce', () => {
		const ids = new Set(SYNTHETIC.map((c) => c.id));
		expect(ids).toContain('events');
		expect(ids).toContain('activism');
		expect(ids).toContain('events/networking');
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/collections/__tests__/route.test.ts`
Expected: FAIL — cannot resolve `../route.ts`.

- [ ] **Step 3: Create `src/collections/route.ts`**

Move code out of `src/pages/collections/[...collection].astro` **unchanged**, from these exact line ranges (verify them against the file first — they shift as you edit):

| Source lines | Moves to |
|---|---|
| 9–16 (`cap`) | `cap`, exported |
| 18–42 (`SYNTHETIC`) | `SYNTHETIC`, exported |
| 44–48 (`type Node`) | `Node`, exported |
| 50–65 (`buildTree`) | `buildTree`, exported |
| 74–85 (slug map + guard) | body of `resolveCollection` |
| 100–125 (row builder block) | body of `filterRows` |
| 130–155 (`getStaticPaths` body) | body of `collectionPaths` |

Copy each block character-for-character. Two behavioural changes only, both required for Spanish:

1. `filterRows` takes `allLabel` and `allOfLabel` instead of hardcoding `'All'` and `` `All ${name}` ``.
2. `resolveCollection` is a named function so both routes share the guard.

```ts
import type { Collection } from '../data/galleryData.ts';
import { getCollections } from '../data/imageStore';
import { buildSlugMap, slugifyId } from '../seo/slug.ts';

/** Turns a path segment into a display name. */
export const cap = (s: string): string =>
	s
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.split(' ')
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(' ');

/**
 * Copy for the intermediate tree nodes, which are synthesised from the id
 * paths rather than declared in gallery.yaml.
 */
export const SYNTHETIC: Collection[] = [
	/* the three entries, moved verbatim from the page */
];

export type Node = { id: string; name: string; children: Map<string, Node> };

export const buildTree = (ids: string[]): Node => {
	/* moved verbatim */
};

export const resolveCollection = (
	slug: string | undefined,
	collections: Collection[],
): string | undefined => {
	const slugMap = buildSlugMap(collections.map((c) => c.id).concat(SYNTHETIC.map((c) => c.id)));
	const collection = slug ? slugMap.get(slug) : undefined;
	if (slug && !collection) {
		throw new Error(
			`Unmapped collection slug "${slug}": no matching id in slugMap. ` +
				`getStaticPaths derives routes from every node in the real collection tree, ` +
				`while slugMap is built from rawCollections plus the hand-maintained SYNTHETIC ` +
				`array — check whether a new collection was added without a matching ` +
				`SYNTHETIC entry.`,
		);
	}
	return collection;
};

export type Row = {
	parentId: string | undefined;
	parentName: string;
	items: { id: string; name: string }[];
	activeId: string | undefined;
};

export const filterRows = (
	tree: Node,
	activeSegments: string[],
	allLabel: string,
	allOfLabel: string,
): Row[] => {
	/* moved verbatim, except the parent chip: */
	//   row.items = [...row.items, { id: cur.id, name: allOfLabel.replace('{name}', cur.name) }];
	//   and row.parentName uses allLabel where it previously used 'All'
};

export const collectionPaths = async (): Promise<
	{ params: { collection: string | undefined } }[]
> => {
	/* the existing getStaticPaths body, moved verbatim */
};

export { slugifyId };
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/collections/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `src/components/CollectionPage.astro`**

Everything below the frontmatter of the current page, taking data as props so both routes render it.

```astro
---
import PhotoGrid from './PhotoGrid.astro';
import { slugifyId, type Row } from '../collections/route.ts';
import type { Image } from '../data/galleryData';
import { localeFromPath, localePath, useTranslations } from '../i18n/index.ts';

interface Props {
	heading: string;
	tagline: string;
	rows: Row[];
	images: Image[];
	collection: string | undefined;
}

const { heading, tagline, rows, images, collection } = Astro.props;
const locale = localeFromPath(Astro.url.pathname);
const t = useTranslations(locale);
const href = (id: string) => localePath(`/collections/${slugifyId(id)}/`, locale);
const indexHref = localePath('/collections/', locale);
---
```

The template body is the existing markup with `/collections/…` replaced by `href(item.id)` / `indexHref`, and the bare `All` chip label replaced by `{t.gallery.all}`.

- [ ] **Step 6: Reduce the English page to a wrapper**

`src/pages/collections/[...collection].astro` keeps only: fetching data, computing meta and crumbs, and rendering `CollectionPage` inside `MainLayout`. It must `export const getStaticPaths = collectionPaths;`.

- [ ] **Step 7: Prove the refactor changed nothing**

```bash
npm run build
diff -r /tmp/baseline-en dist
```

Expected: only the Task 2 `og:locale` / `inLanguage` differences. Any change to a collections page is a regression — stop and fix.

- [ ] **Step 8: Commit**

```bash
npx vitest run && npm run seo:check && npm run prettier && npm run lint
git add src/collections src/components/CollectionPage.astro "src/pages/collections/[...collection].astro"
git commit -m "Extract the collections route into a shared module

Pure refactor, verified by diffing dist against a pre-change build. The slug
map, the synthetic intermediate nodes and the unmapped-slug guard now exist
once, so the Spanish route reuses them rather than owning a second copy that
could drift."
```

---

### Task 4: Move component strings into the dictionary

Every user-facing English string moves out of markup and into `en.ts`. English output must remain byte-identical — that is the whole test.

**Files:**
- Modify: `src/components/NavBar.astro:8-12`
- Modify: `src/components/LandingHero-1.astro:12-48`
- Modify: `src/components/HomeIntro.astro:11-37`
- Modify: `src/components/FeaturedGallery.astro`, `FeaturedWorkScroll.astro`, `CalBooking.astro`
- Modify: `src/pages/index.astro`, `src/pages/book.astro` — titles/descriptions from `t.meta`

**Interfaces:**
- Consumes: `useTranslations`, `localeFromPath`, `localePath` (Task 1)
- Produces: no new exports; components self-resolve locale from `Astro.url.pathname`

- [ ] **Step 1: Establish the guard before changing anything**

```bash
npm run build && cp -r dist /tmp/baseline-t4
```

- [ ] **Step 2: Convert NavBar**

```astro
const locale = localeFromPath(Astro.url.pathname);
const t = useTranslations(locale);
const menuItems = [
	{ name: t.nav.home, link: localePath('/', locale) },
	{ name: t.nav.gallery, link: localePath('/collections/', locale) },
	{ name: t.nav.book, link: localePath('/book/', locale) },
];
```

The logo `href="/"` becomes `href={localePath('/', locale)}`.

- [ ] **Step 3: Convert LandingHero-1**

Replace each literal with its dictionary key: `t.hero.word`, `t.hero.partOfSpeech`, `t.hero.countable`, `t.hero.ipa`, `t.hero.definition`, `t.hero.attribution`, `t.hero.viewGallery`. The `View Gallery` anchor's `href` becomes `localePath('/collections/', locale)`.

Keep every class attribute exactly as-is, including the `text-gray-500` contrast comment — that value is load-bearing for WCAG AA on this card.

- [ ] **Step 4: Convert HomeIntro**

```astro
<h2 class="reveal text-2xl md:text-3xl font-bold">{t.home.introHeading}</h2>
{t.home.paragraphs.map((html) => <p class="reveal" set:html={html} />)}
```

The `<style>` block is untouched.

- [ ] **Step 5: Convert the remaining three components and both pages**

`FeaturedGallery` → `t.featured.works`; `FeaturedWorkScroll` → `t.featured.work`; `CalBooking` → `t.book.bookConsultation`. `index.astro` passes `t.meta.home.title` / `.description`; `book.astro` passes `t.meta.book.*` and uses `t.book.heading`, `t.book.bookService`, `t.book.bookEmail`, `t.book.profileAlt`.

- [ ] **Step 6: Prove English is unchanged**

```bash
npm run build && diff -r /tmp/baseline-t4 dist
```

Expected: **no output at all.** Any difference means a string was altered in the move — fix it rather than accepting the new text.

- [ ] **Step 7: Commit**

```bash
npx vitest run && npm run seo:check && npm run prettier && npm run lint
git add src/components src/pages/index.astro src/pages/book.astro
git commit -m "Move component strings into the i18n dictionary

English output is byte-identical, verified by diffing dist against a
pre-change build — the whole point of this step is that nothing moved except
where the strings live."
```

---

### Task 5: Spanish collection copy

**Files:**
- Modify: `src/data/galleryData.ts:22-27` — add the optional `es` field
- Modify: `src/gallery/gallery.yaml` — an `es:` block on all 11 collections
- Modify: `src/collections/route.ts` — an `es` block on all 3 `SYNTHETIC` entries
- Modify: `src/seo/collectionMeta.ts` — accept a locale
- Test: `src/seo/__tests__/collectionMeta.test.ts`

**Interfaces:**
- Produces: `collectionMeta(id, collections, locale?: Locale): CollectionMeta`; `Collection.es?: { name: string; heading: string; tagline: string }`

- [ ] **Step 1: Write the failing test**

Append to `src/seo/__tests__/collectionMeta.test.ts`:

```ts
describe('locale', () => {
	const collections = [
		{
			id: 'weddings',
			name: 'Weddings',
			heading: 'Wedding Photography',
			tagline: 'Weddings in Barcelona.',
			es: { name: 'Bodas', heading: 'Fotografía de bodas', tagline: 'Bodas en Barcelona.' },
		},
	];

	it('defaults to English', () => {
		expect(collectionMeta('weddings', collections).heading).toBe('Wedding Photography');
	});

	it('uses the Spanish block when asked', () => {
		const meta = collectionMeta('weddings', collections, 'es');
		expect(meta.heading).toBe('Fotografía de bodas');
		expect(meta.tagline).toBe('Bodas en Barcelona.');
	});

	it('localises the index page', () => {
		expect(collectionMeta(undefined, collections, 'es').heading).toContain('Barcelona');
		expect(collectionMeta(undefined, collections, 'es').heading).not.toBe(
			collectionMeta(undefined, collections).heading,
		);
	});

	it('falls back to English rather than rendering nothing', () => {
		const partial = [{ id: 'x', name: 'X', heading: 'X Photography', tagline: 'X.' }];
		expect(collectionMeta('x', partial, 'es').heading).toBe('X Photography');
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/seo/__tests__/collectionMeta.test.ts`
Expected: FAIL — `collectionMeta` takes two arguments.

- [ ] **Step 3: Extend the `Collection` type**

```ts
export interface Collection {
	id: string;
	name: string;
	heading?: string;
	tagline?: string;
	/** Spanish copy, colocated with the English original. */
	es?: { name: string; heading: string; tagline: string };
}
```

- [ ] **Step 4: Teach `collectionMeta` about locales**

Add a Spanish `ROOT_ES` beside the existing `ROOT`:

```ts
const ROOT_ES: CollectionMeta = {
	heading: 'Portafolio de fotografía — Barcelona',
	tagline:
		'Bodas, eventos, vida nocturna y trabajo documental, fotografiados en Barcelona, en España y en Estados Unidos.',
	title: 'Portafolio de fotografía — Barcelona',
	description:
		'Bodas, eventos, vida nocturna y trabajo documental de Hanna, fotografiados en Barcelona, en España y en Estados Unidos.',
};
```

Signature becomes `(id, collections, locale: Locale = DEFAULT_LOCALE)`. For `es`, prefer `configured?.es?.heading` and fall back to the English `configured?.heading`, then to the derived name. A missing Spanish block degrades to English rather than to a blank page; Task 9's build guard is what stops that degradation shipping unnoticed.

- [ ] **Step 5: Add the Spanish blocks to `gallery.yaml`**

One `es:` block per collection, nested under it. All eleven:

```yaml
  - id: events/nightclub
    name: Events Nightclub
    heading: Nightlife & Club Photography
    tagline: Late nights in Barcelona, shot in available light.
    es:
      name: Vida nocturna
      heading: Fotografía de vida nocturna y discotecas
      tagline: Noches largas en Barcelona, con luz disponible.
```

Remaining ten, in the same shape:

| id | es.name | es.heading | es.tagline |
|---|---|---|---|
| `events/networking/Venture capital party` | Fiesta de capital riesgo | Fiesta de capital riesgo | Una fiesta de capital riesgo fotografiada en Houston, Texas. |
| `events/networking/Pitch deck` | Noche de pitches | Noche de pitches para startups | Una noche de pitches fotografiada en Houston, Texas. |
| `events/networking/Startup panel` | Panel de startups | Panel de startups | Un panel de startups fotografiado en Houston, Texas. |
| `events/networking/corporate dinner` | Cena corporativa | Cena corporativa | Una cena de empresa fotografiada en Houston, Texas. |
| `events/sport` | Deporte | Fotografía deportiva | Deporte y entrenamiento al aire libre en Barcelona. |
| `events/birthday` | Cumpleaños | Cumpleaños y celebraciones privadas | Celebraciones privadas fotografiadas en Houston, Texas. |
| `activism/Barcelona Pride` | Orgullo de Barcelona | Orgullo de Barcelona | El Orgullo fotografiado en las calles de Barcelona. |
| `activism/Mexico` | Comunidad mexicana | Protesta por los derechos de los inmigrantes | Una protesta de la comunidad mexicana de Houston por los derechos de los inmigrantes. |
| `activism/Ukraine` | Comunidad ucraniana | Homenaje de la comunidad ucraniana | Un homenaje de la comunidad ucraniana de Houston en el aniversario de la guerra. |
| `weddings` | Bodas | Fotografía de bodas en Barcelona | Bodas en Barcelona, la Costa Brava y más allá. |

Confirm the exact ids first with `grep '^  - id:' src/gallery/gallery.yaml` — ids are case-sensitive and contain spaces.

- [ ] **Step 6: Add the Spanish blocks to `SYNTHETIC`**

```ts
{
	id: 'events',
	name: 'Events',
	heading: 'Event Photography in Barcelona & Beyond',
	tagline: '…unchanged…',
	es: {
		name: 'Eventos',
		heading: 'Fotografía de eventos en Barcelona y más allá',
		tagline:
			'Vida nocturna y deporte en Barcelona; networking, cenas de empresa y celebraciones privadas en Houston.',
	},
},
```

`activism` → name `Activismo`, heading `Trabajo documental y periodístico`, tagline `Fotografía de protestas y homenajes: el Orgullo en Barcelona, derechos de los inmigrantes y el aniversario de la guerra en Ucrania, en Houston.`

`events/networking` → name `Networking`, heading `Networking y eventos corporativos`, tagline `Paneles de startups, noches de pitches y cenas de empresa en Houston, Texas.`

- [ ] **Step 7: Run the tests and verify the generator is non-destructive**

```bash
npx vitest run
npm run generate && git diff --stat src/gallery/gallery.yaml
```

Expected: tests PASS, and `git diff` shows **no change** to `gallery.yaml` — confirming `mergeGalleriesObj` preserved the hand-written Spanish, as the spec claims.

- [ ] **Step 8: Commit**

```bash
npm run prettier && npm run lint
git add src/data/galleryData.ts src/gallery/gallery.yaml src/collections/route.ts src/seo
git commit -m "Add Spanish collection copy alongside the English originals

Colocated rather than kept in a separate translation file so adding a
collection means editing one place. Verified npm run generate leaves the
hand-written Spanish intact."
```

---

### Task 6: Spanish Book page content

**Files:**
- Create: `src/content/book.es.md`
- Modify: `src/pages/book.astro` — select the content file by locale

- [ ] **Step 1: Read the English source**

```bash
cat src/content/book.md
```

- [ ] **Step 2: Write `src/content/book.es.md`**

A Spanish rewrite of all 329 words, not a literal translation. Requirements: *fotógrafa* throughout; the TFP and reduced-rate offer must name the categories being built (creative and conceptual shoots, portraits, proposals, property/Airbnb, landscape and night); rates and contact details must match the English exactly.

- [ ] **Step 3: Select content by locale in `book.astro`**

```astro
import { Content as BookPageEn } from '../content/book.md';
import { Content as BookPageEs } from '../content/book.es.md';

const locale = localeFromPath(Astro.url.pathname);
const BookPage = locale === 'es' ? BookPageEs : BookPageEn;
```

- [ ] **Step 4: Verify English is unchanged and commit**

```bash
npm run build && diff -r /tmp/baseline-t4 dist | grep -v og:locale | grep -v inLanguage
npx vitest run && npm run prettier && npm run lint
git add src/content/book.es.md src/pages/book.astro
git commit -m "Add the Spanish Book page content"
```

---

### Task 7: Spanish routes

The first task that emits new URLs. hreflang stays dormant, so these pages exist but are not yet advertised to Google.

**Files:**
- Create: `src/pages/es/index.astro`
- Create: `src/pages/es/book.astro`
- Create: `src/pages/es/collections/[...collection].astro`

- [ ] **Step 1: Create the three routes**

Each mirrors its English counterpart exactly. Because components derive locale from `Astro.url.pathname`, and these render under `/es/`, no locale prop is passed anywhere. The collections route re-exports the shared paths:

```astro
export const getStaticPaths = collectionPaths;
```

and passes `locale` to `collectionMeta(collection, allCollections, 'es')`.

- [ ] **Step 2: Build and confirm the page count doubled**

```bash
npm run build
find dist -name index.html | wc -l    # expect 34
find dist/es -name index.html | wc -l # expect 17
```

- [ ] **Step 3: Spot-check three Spanish pages**

```bash
grep -o '<title>[^<]*' dist/es/index.html
grep -o '<html lang="[^"]*"' dist/es/index.html
grep -o '<title>[^<]*' dist/es/collections/weddings/index.html
grep -c 'hreflang' dist/es/index.html   # expect 0 — activation is Task 10
```

Expected: Spanish titles, `lang="es"`, zero hreflang links.

- [ ] **Step 4: Verify English pages are still untouched**

```bash
diff -r /tmp/baseline-t4 dist/collections
```

Expected: only the `og:locale` / `inLanguage` differences from Task 2.

- [ ] **Step 5: Commit**

```bash
npx vitest run && npm run prettier && npm run lint
git add src/pages/es
git commit -m "Add the Spanish routes

The pages exist but are not advertised: hreflang stays dormant until the
final task, so Google never sees an alternate pointing at a page that is
still being finished."
```

Note: `npm run seo:check` is expected to FAIL here — it asserts 17 pages and does not yet know about hreflang. Task 9 fixes it. Do not weaken the guard to make this task pass.

---

### Task 8: Language switcher

**Files:**
- Create: `src/components/LanguageSwitcher.astro`
- Modify: `src/components/NavBar.astro` — desktop and mobile menus

- [ ] **Step 1: Build the switcher from `alternates()`**

It renders the current page's counterpart URL by reusing `localePath(Astro.url.pathname, other)`, so the switcher and the hreflang tags derive from the same rule and cannot disagree.

```astro
---
import { LOCALES } from '../seo/defaults.ts';
import { localeFromPath, localePath, useTranslations } from '../i18n/index.ts';

const current = localeFromPath(Astro.url.pathname);
const t = useTranslations(current);
const options = LOCALES.map((locale) => ({
	locale,
	href: localePath(Astro.url.pathname, locale),
	current: locale === current,
}));
---

<nav aria-label={t.nav.language} class="flex items-center gap-2 text-sm">
	{
		options.map((option) => (
			<a
				href={option.href}
				hreflang={option.locale}
				lang={option.locale}
				aria-current={option.current ? 'true' : undefined}
				class={option.current ? 'font-semibold underline' : 'text-gray-600 hover:text-black'}
			>
				{option.locale.toUpperCase()}
			</a>
		))
	}
</nav>
```

- [ ] **Step 2: Place it in both menus**

Add to the desktop menu container and inside the mobile panel, keeping the existing `@click="isOpen = false"` behaviour on mobile links.

- [ ] **Step 3: Verify the switcher round-trips**

```bash
npm run build
grep -o 'href="/es/collections/weddings/"' dist/collections/weddings/index.html
grep -o 'href="/collections/weddings/"' dist/es/collections/weddings/index.html
```

Expected: each page links to its counterpart. A missing match means `localePath` is not idempotent for that path — fix the helper, not the template.

- [ ] **Step 4: Commit**

```bash
npx vitest run && npm run prettier && npm run lint
git add src/components/LanguageSwitcher.astro src/components/NavBar.astro
git commit -m "Add the language switcher

Targets come from localePath, the same rule hreflang uses, so the visible
switcher and the machine-readable alternates cannot drift apart."
```

---

### Task 9: Extend the build guard

**Files:**
- Modify: `scripts/check-seo.ts`

- [ ] **Step 1: Add hreflang reciprocity and Spanish completeness**

Three additions to `read()` and `main()`:

1. Capture `hreflangs: [...html.matchAll(/<link rel="alternate" hreflang="([^"]*)" href="([^"]*)"/g)]`.
2. For every advertised alternate, assert the corresponding file exists in `dist/`. Map the URL back to a path by stripping `SITE` and appending `index.html`. A hreflang pointing at a 404 is the single worst outcome of this project — this check is the reason it cannot ship.
3. Assert no Spanish page carries a title or description identical to its English counterpart, which is how a missing `es:` block surfaces.

- [ ] **Step 2: Watch the guard fail before trusting it**

Temporarily delete one `es:` block from `gallery.yaml`, run `npm run build && npm run seo:check`, and confirm it fails naming that page. Restore the block. A guard never seen failing is not known to work.

- [ ] **Step 3: Run the full check**

```bash
npm run build && npm run seo:check
```

Expected: `SEO check passed: 34 pages, all unique.`

- [ ] **Step 4: Commit**

```bash
npm run prettier && npm run lint
git add scripts/check-seo.ts
git commit -m "Extend the SEO guard for two locales

Adds hreflang reciprocity — every advertised alternate must exist in dist —
and catches a Spanish page that fell back to English copy. Both were watched
failing before being trusted."
```

---

### Task 10: Activate hreflang and sitemap alternates

The last task, and the only one that changes what Google sees.

**Files:**
- Modify: `astro.config.mts` — sitemap i18n
- Modify: `src/pages/index.astro`, `book.astro`, `collections/[...collection].astro` and all three `src/pages/es/` routes — pass `availableLocales`

- [ ] **Step 1: Configure the sitemap**

```ts
integrations: [
	sitemap({
		i18n: {
			defaultLocale: 'en',
			locales: { en: 'en', es: 'es' },
		},
	}),
],
```

- [ ] **Step 2: Declare both locales on every page**

Add `availableLocales={['en', 'es']}` to the `MainLayout` invocation in all six route files. Every page genuinely exists in both languages, which is what makes this safe — that was Spec Decision 1.

- [ ] **Step 3: Verify hreflang is complete and reciprocal**

`src/seo/__tests__/hreflang.test.ts` already covers `alternates()` with two
locales, x-default, the root path and prefix stripping. Do not add duplicate
unit tests here; this step verifies the rendered output instead.

```bash
npm run build && npm run seo:check
grep -o 'hreflang="[^"]*" href="[^"]*"' dist/index.html
grep -o 'hreflang="[^"]*" href="[^"]*"' dist/es/index.html
grep -c '<xhtml:link' dist/sitemap-0.xml
```

Expected: each page emits `en`, `es` and `x-default`; `x-default` points at the English URL on both; the sitemap carries alternate links.

- [ ] **Step 4: Confirm every advertised URL resolves**

```bash
for u in $(grep -oh 'hreflang="[^"]*" href="https://cedar4st.com[^"]*"' -r dist --include=index.html \
  | grep -o 'https://cedar4st.com[^"]*' | sort -u); do
  p="dist${u#https://cedar4st.com}index.html"
  [ -f "$p" ] || echo "MISSING: $u"
done
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
npx vitest run && npm run prettier && npm run lint
git add astro.config.mts src/pages
git commit -m "Activate hreflang and sitemap alternates

Sequenced last so Google never saw an alternate pointing at an unfinished
page. Every advertised URL was confirmed to resolve in dist before this
shipped."
```

- [ ] **Step 6: Hand back for review**

Do not push. Report to Hanna: the Spanish copy needs her review, particularly the hero card definition and the Book page, and the `/es/` pages need a visual check. After she approves, resubmit the sitemap in Search Console so the Spanish URLs are discovered.

---

## Post-implementation

- Spanish copy review by Hanna — hero card, Book page, collection taglines
- Visual check of `/es/` on mobile and desktop
- Search Console: resubmit sitemap; expect Spanish URLs to be discovered over the following days
- Bing Webmaster: same
- Deferred by the spec and still deferred: Spanish alt text, Catalan
