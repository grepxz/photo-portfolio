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
