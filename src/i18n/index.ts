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
