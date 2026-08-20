import type { Collection } from '../data/galleryData.ts';
import { getCollections } from '../data/imageStore';
import { buildSlugMap, slugifyId } from '../seo/slug.ts';

export const cap = (s: string) =>
	s
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.split(' ')
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(' ');

/**
 * Copy for the intermediate tree nodes, which are synthesised from the id paths
 * rather than declared in gallery.yaml.
 */
export const SYNTHETIC: Collection[] = [
	{
		id: 'events',
		name: 'Events',
		heading: 'Event Photography in Barcelona & Beyond',
		tagline:
			'Nightlife and sport in Barcelona; networking, corporate evenings and private celebrations in Houston.',
		es: {
			name: 'Eventos',
			heading: 'Fotografía de eventos en Barcelona y más allá',
			tagline:
				'Vida nocturna y deporte en Barcelona; networking, cenas de empresa y celebraciones privadas en Houston.',
		},
	},
	{
		id: 'activism',
		name: 'Activism',
		heading: 'Documentary & Journalistic Work',
		tagline:
			'Protest and memorial photography — Pride in Barcelona, immigration-rights and Ukraine anniversary gatherings in Houston.',
		es: {
			name: 'Activismo',
			heading: 'Trabajo documental y periodístico',
			tagline:
				'Fotografía de protestas y homenajes: el Orgullo en Barcelona, derechos de los inmigrantes y el aniversario de la guerra en Ucrania, en Houston.',
		},
	},
	{
		id: 'events/networking',
		name: 'Events Networking',
		heading: 'Networking & Corporate Events',
		tagline: 'Startup panels, pitch nights and corporate dinners in Houston, Texas.',
		es: {
			name: 'Networking',
			heading: 'Networking y eventos corporativos',
			tagline: 'Paneles de startups, noches de pitches y cenas de empresa en Houston, Texas.',
		},
	},
];

export type Node = {
	id: string;
	name: string;
	children: Map<string, Node>;
};

export const buildTree = (
	ids: string[],
	nameFor: (id: string, seg: string) => string = (_id, seg) => cap(seg),
): Node => {
	const root: Node = { id: '', name: 'All', children: new Map() };
	for (const id of ids) {
		const segments = id.split('/');
		let cur = root;
		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			const fullId = segments.slice(0, i + 1).join('/');
			if (!cur.children.has(seg)) {
				cur.children.set(seg, { id: fullId, name: nameFor(fullId, seg), children: new Map() });
			}
			cur = cur.children.get(seg)!;
		}
	}
	return root;
};

/**
 * Resolves a route slug back to the collection id it names. Throws rather
 * than silently rendering the wrong page if a slug has no match.
 */
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
				`array above — check whether a new collection was added without a matching ` +
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
	const rows: Row[] = [];
	let cur: Node | undefined = tree;
	for (let depth = 0; cur && cur.children.size > 0; depth++) {
		const items = [...cur.children.values()].map((c) => ({ id: c.id, name: c.name }));
		const activeChildSeg = activeSegments[depth];
		const activeChild = activeChildSeg ? cur.children.get(activeChildSeg) : undefined;
		const row: Row = {
			parentId: cur.id || undefined,
			parentName: cur.id ? cur.name : allLabel,
			items,
			activeId: activeChild?.id,
		};
		if (depth > 0) {
			row.items = [...row.items, { id: cur.id, name: allOfLabel.replace('{name}', cur.name) }];
		}
		rows.push(row);
		cur = activeChild;
	}
	return rows;
};

type PathNode = { id?: string; children: Map<string, PathNode> };

export const collectionPaths = async (): Promise<
	{ params: { collection: string | undefined } }[]
> => {
	const cols = await getCollections();
	const t = (() => {
		const root: PathNode = { children: new Map() };
		for (const c of cols) {
			const segs = c.id.split('/');
			let cur: PathNode = root;
			for (let i = 0; i < segs.length; i++) {
				const seg = segs[i];
				const fullId = segs.slice(0, i + 1).join('/');
				if (!cur.children.has(seg)) cur.children.set(seg, { id: fullId, children: new Map() });
				cur = cur.children.get(seg)!;
			}
		}
		return root;
	})();
	const ids = new Set<string | undefined>([undefined]);
	const walk = (n: PathNode) => {
		if (n.id) ids.add(n.id);
		for (const c of n.children.values()) walk(c);
	};
	walk(t);
	// Routes are emitted under slugs; the page resolves the slug back to the id.
	return [...ids].map((id) => ({ params: { collection: id ? slugifyId(id) : undefined } }));
};

export { slugifyId };
