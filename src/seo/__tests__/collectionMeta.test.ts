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
		expect(meta.tagline).toEqual(
			'Weddings, events, nightlife and documentary work, photographed in Barcelona, across Spain and in the United States.',
		);
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
		expect(meta.heading).toEqual('Sport Photography');
		expect(meta.tagline).toContain('by Hanna');
		expect(meta.description).toContain('Sport');
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
