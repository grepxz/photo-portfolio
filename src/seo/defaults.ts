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
