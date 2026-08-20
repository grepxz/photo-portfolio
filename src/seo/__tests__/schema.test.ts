import { describe, expect, it } from 'vitest';
import { BRAND, OWNER, SITE } from '../defaults.ts';
import { BUSINESS_ID, breadcrumbList, person, professionalService } from '../schema.ts';

describe('professionalService', () => {
	const schema = professionalService();

	it('is a ProfessionalService in the schema.org context', () => {
		expect(schema['@context']).toEqual('https://schema.org');
		expect(schema['@type']).toEqual('ProfessionalService');
	});

	it('carries a stable identifier other nodes can reference', () => {
		expect(schema['@id']).toEqual(BUSINESS_ID);
	});

	it('is named for the brand and points at the site', () => {
		expect(schema.name).toEqual(BRAND);
		expect(schema.url).toEqual(`${SITE}/`);
	});

	it('emits no postal address, because this is a service-area business', () => {
		expect(schema).not.toHaveProperty('address');
	});

	it('serves Barcelona', () => {
		expect(schema.areaServed).toMatchObject({ '@type': 'City', name: 'Barcelona' });
	});

	it('lists the service types that have galleries behind them', () => {
		expect(schema.serviceType).toEqual(
			expect.arrayContaining([
				'Wedding photography',
				'Event photography',
				'Documentary photography',
			]),
		);
	});

	it('links the Instagram profile as sameAs', () => {
		expect(schema.sameAs).toContain('https://www.instagram.com/bluecatch.ca/');
	});

	it('never claims the bare instagram.com domain as an identity', () => {
		expect(schema.sameAs).not.toContain('https://www.instagram.com');
	});
});

describe('person', () => {
	const schema = person();

	it('describes the owner and links to the business', () => {
		expect(schema['@type']).toEqual('Person');
		expect(schema.name).toEqual(OWNER);
		expect(schema.worksFor).toEqual({ '@id': BUSINESS_ID });
	});

	it('states the occupation', () => {
		expect(schema.jobTitle).toEqual('Photographer');
	});
});

describe('breadcrumbList', () => {
	it('numbers positions from one and resolves absolute URLs', () => {
		const schema = breadcrumbList([
			{ name: 'Gallery', path: '/collections/' },
			{ name: 'Events', path: '/collections/events/' },
			{ name: 'Nightclub', path: '/collections/events/nightclub/' },
		]);

		expect(schema['@type']).toEqual('BreadcrumbList');
		expect(schema.itemListElement).toHaveLength(3);
		expect(schema.itemListElement[0]).toMatchObject({
			position: 1,
			name: 'Gallery',
			item: `${SITE}/collections/`,
		});
		expect(schema.itemListElement[2]).toMatchObject({
			position: 3,
			item: `${SITE}/collections/events/nightclub/`,
		});
	});

	it('returns an empty list for no crumbs', () => {
		expect(breadcrumbList([]).itemListElement).toEqual([]);
	});
});

describe('locale handling', () => {
	it('defaults to English', () => {
		expect(professionalService().inLanguage).toBe('en');
		expect(person().inLanguage).toBe('en');
	});

	it('carries the requested locale', () => {
		expect(professionalService('es').inLanguage).toBe('es');
		expect(person('es').inLanguage).toBe('es');
	});

	it('keeps @id stable across locales so the entity is not duplicated', () => {
		expect(professionalService('es')['@id']).toBe(professionalService('en')['@id']);
		expect(person('es')['@id']).toBe(person('en')['@id']);
	});
});
