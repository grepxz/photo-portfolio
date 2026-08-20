/**
 * The contract between locales.
 *
 * `es.ts` is typed as `Strings`, so a forgotten key is a compile error rather
 * than an English word rendered on a Spanish page.
 *
 * Paragraph fields hold HTML because they contain inline links, and each
 * locale carries its own already-correct hrefs — the Spanish copy links to
 * /es/collections/…, so no rewriting happens at render time.
 */
export interface Strings {
	nav: {
		home: string;
		gallery: string;
		book: string;
		/** Accessible label for the language switcher. */
		language: string;
	};
	hero: {
		word: string;
		partOfSpeech: string;
		countable: string;
		ipa: string;
		definition: string;
		attribution: string;
		viewGallery: string;
	};
	home: {
		introHeading: string;
		/** HTML; rendered with set:html. */
		paragraphs: string[];
	};
	featured: {
		works: string;
		work: string;
		subtitle: string;
		/** Accessible label for the scroll-to-content button on the homepage hero. */
		scrollLabel: string;
	};
	gallery: {
		/** The chip that clears all filters. */
		all: string;
		/** Parent chip. `{name}` is replaced with the parent's display name. */
		allOf: string;
		/** Breadcrumb label for the collections index. */
		breadcrumb: string;
	};
	book: {
		heading: string;
		bookService: string;
		bookEmail: string;
		bookConsultation: string;
		profileAlt: string;
	};
	meta: {
		home: { title: string; description: string };
		book: { title: string; description: string };
	};
}
