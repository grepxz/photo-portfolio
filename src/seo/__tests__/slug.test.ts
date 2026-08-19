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
