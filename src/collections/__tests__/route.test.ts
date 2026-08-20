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
