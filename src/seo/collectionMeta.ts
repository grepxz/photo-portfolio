import type { Collection } from '../data/galleryData.ts';
import { DEFAULT_LOCALE, type Locale } from './defaults.ts';

export interface CollectionMeta {
	/** Visible page h1. */
	heading: string;
	/** Visible sub-heading, reused as the meta description. */
	tagline: string;
	/** Page title, before the brand suffix is appended. */
	title: string;
	description: string;
}

const ROOT: CollectionMeta = {
	heading: 'Photography Portfolio — Barcelona',
	tagline:
		'Weddings, events, nightlife and documentary work, photographed in Barcelona, across Spain and in the United States.',
	title: 'Photography Portfolio — Barcelona',
	description:
		'Weddings, events, nightlife and documentary work by Hanna, photographed in Barcelona, across Spain and in the United States.',
};

const ROOT_ES: CollectionMeta = {
	heading: 'Portafolio de fotografía — Barcelona',
	tagline:
		'Bodas, eventos, vida nocturna y trabajo documental, fotografiados en Barcelona, en España y en Estados Unidos.',
	title: 'Portafolio de fotografía — Barcelona',
	description:
		'Bodas, eventos, vida nocturna y trabajo documental de Hanna, fotografiados en Barcelona, en España y en Estados Unidos.',
};

/** Turns a path segment into a display name, matching the page component. */
const humanise = (segment: string): string =>
	segment
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.split(' ')
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');

export const collectionMeta = (
	id: string | undefined,
	collections: Collection[],
	locale: Locale = DEFAULT_LOCALE,
): CollectionMeta => {
	if (!id) return locale === 'es' ? ROOT_ES : ROOT;

	const configured = collections.find((collection) => collection.id === id);
	const name = humanise(id.split('/').pop() ?? id);

	const heading =
		locale === 'es'
			? (configured?.es?.heading ?? configured?.heading ?? `${name} Photography`)
			: (configured?.heading ?? `${name} Photography`);
	const tagline =
		locale === 'es'
			? (configured?.es?.tagline ?? configured?.tagline ?? `${name} photography by Hanna.`)
			: (configured?.tagline ?? `${name} photography by Hanna.`);

	return {
		heading,
		tagline,
		title: heading,
		description: tagline,
	};
};
