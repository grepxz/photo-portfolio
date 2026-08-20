import { describe, expect, it } from 'vitest';
import { ogLocale } from '../ogLocale.ts';

describe('ogLocale', () => {
	it('maps bare locales to the territory form Open Graph expects', () => {
		expect(ogLocale('en')).toBe('en_US');
		expect(ogLocale('es')).toBe('es_ES');
	});
});
