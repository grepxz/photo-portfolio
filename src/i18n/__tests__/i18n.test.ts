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
		expect(es.hero.viewGallery).not.toBe(en.hero.viewGallery);
	});
});
