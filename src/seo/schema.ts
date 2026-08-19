import { BRAND, DEFAULT_OG_IMAGE, OWNER, POSITIONING, SITE } from './defaults.ts';
import { canonicalFor } from './meta.ts';

export type JsonLd = Record<string, unknown>;

/** Stable node identifiers so schema nodes can cross-reference each other. */
export const BUSINESS_ID = `${SITE}/#business`;
export const PERSON_ID = `${SITE}/#hanna`;

/**
 * Profile URLs proving this entity is the same one found elsewhere. Only add
 * URLs that identify a specific profile — a bare domain identifies nothing and
 * emitting it would be a false identity claim.
 */
const SAME_AS: string[] = ['https://www.instagram.com/bluecatch.ca/'];

/** Categories with actual galleries behind them. Kept honest on purpose. */
const SERVICE_TYPES = [
	'Wedding photography',
	'Event photography',
	'Documentary photography',
	'Concert and nightlife photography',
	'Sports photography',
	'Portrait photography',
];

export const professionalService = (): JsonLd => {
	const schema: JsonLd = {
		'@context': 'https://schema.org',
		'@type': 'ProfessionalService',
		'@id': BUSINESS_ID,
		name: BRAND,
		description: POSITIONING,
		url: `${SITE}/`,
		image: `${SITE}${DEFAULT_OG_IMAGE}`,
		areaServed: {
			'@type': 'City',
			name: 'Barcelona',
			address: { '@type': 'PostalAddress', addressCountry: 'ES' },
		},
		serviceType: SERVICE_TYPES,
		founder: { '@id': PERSON_ID },
		knowsLanguage: ['en', 'es'],
	};

	if (SAME_AS.length > 0) {
		schema.sameAs = SAME_AS;
	}

	return schema;
};

export const person = (): JsonLd => ({
	'@context': 'https://schema.org',
	'@type': 'Person',
	'@id': PERSON_ID,
	name: OWNER,
	jobTitle: 'Photographer',
	url: `${SITE}/book/`,
	worksFor: { '@id': BUSINESS_ID },
});

export interface Crumb {
	name: string;
	path: string;
}

export const breadcrumbList = (crumbs: Crumb[]): JsonLd => ({
	'@context': 'https://schema.org',
	'@type': 'BreadcrumbList',
	itemListElement: crumbs.map((crumb, index) => ({
		'@type': 'ListItem',
		position: index + 1,
		name: crumb.name,
		item: canonicalFor(crumb.path),
	})),
});
