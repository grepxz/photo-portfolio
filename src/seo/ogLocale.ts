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
