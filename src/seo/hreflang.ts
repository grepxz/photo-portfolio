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
