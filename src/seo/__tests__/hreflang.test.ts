import { describe, expect, it } from 'vitest';
import { SITE } from '../defaults.ts';
import { alternates } from '../hreflang.ts';

describe('alternates', () => {
	it('emits nothing when only the default locale exists', () => {
		// A hreflang pointing at a page that does not exist is worse than none.
		expect(alternates('/book/', ['en'])).toEqual([]);
	});

	it('emits nothing for an empty locale list', () => {
		expect(alternates('/book/', [])).toEqual([]);
	});

	it('emits both locales plus x-default once Spanish exists', () => {
		expect(alternates('/book/', ['en', 'es'])).toEqual([
			{ hreflang: 'en', href: `${SITE}/book/` },
			{ hreflang: 'es', href: `${SITE}/es/book/` },
			{ hreflang: 'x-default', href: `${SITE}/book/` },
		]);
	});

	it('handles the root path', () => {
		expect(alternates('/', ['en', 'es'])).toEqual([
			{ hreflang: 'en', href: `${SITE}/` },
			{ hreflang: 'es', href: `${SITE}/es/` },
			{ hreflang: 'x-default', href: `${SITE}/` },
		]);
	});

	it('strips an existing locale prefix before rebuilding', () => {
		expect(alternates('/es/book/', ['en', 'es'])[0]).toEqual({
			hreflang: 'en',
			href: `${SITE}/book/`,
		});
	});
});
