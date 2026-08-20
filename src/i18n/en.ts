import type { Strings } from './types.ts';

const en: Strings = {
	nav: { home: 'Home', gallery: 'Gallery', book: 'Book', language: 'Language' },
	hero: {
		word: 'good photo',
		partOfSpeech: 'noun',
		countable: '[ countable ]',
		ipa: '/ˈfəʊtəʊ/',
		definition: 'evidence that you were, briefly, photogenic.',
		attribution: 'Hanna — documentary, event and wedding photographer in Barcelona',
		viewGallery: 'View Gallery',
	},
	home: {
		introHeading: 'Photography in Barcelona',
		paragraphs: [
			'I photograph <a href="/collections/weddings/">weddings</a>, <a href="/collections/events/">events</a> and <a href="/collections/activism/">documentary work</a> in Barcelona and wherever else the work takes me. My approach centers on raw emotion, genuine reaction, natural movement and minimal editing.',
			'That covers ceremonies and celebrations, corporate evenings and networking nights, sport, concerts and <a href="/collections/events/nightclub/">nightlife</a>, and long-form journalistic projects — Pride in Barcelona, an immigration-rights protest by Houston\'s Mexican community, and a memorial held by Houston\'s Ukrainian community on the anniversary of the war.',
			'I work in English and Spanish, and much of my client work in Barcelona is with visitors and people who have recently moved here. I travel for commissions — the documentary and event work below was photographed in Barcelona, on the Costa Brava, and in Houston, Texas.',
			'There is also work I am actively building and shooting at reduced rates or TFP, including creative and conceptual shoots. <a href="/book/">The details are on the booking page.</a>',
		],
	},
	featured: { works: 'Featured Works', work: 'Featured Work' },
	gallery: { all: 'All', allOf: 'All {name}', breadcrumb: 'Gallery' },
	book: {
		heading: 'Book Me',
		bookService: 'Book my service',
		bookEmail: 'Book through Email',
		bookConsultation: 'Book a consultation',
		profileAlt: 'Hanna editing a photograph in DaVinci Resolve',
	},
	meta: {
		home: {
			title: 'Photographer in Barcelona',
			description:
				'Hanna is a documentary, event and wedding photographer based in Barcelona. Weddings, nightlife, concerts, sport and journalistic work.',
		},
		book: {
			title: 'Book a Photographer in Barcelona',
			description:
				'Book Hanna for weddings, events, portraits and documentary work in Barcelona. Reduced rates and TFP available for selected shoot types.',
		},
	},
};

export default en;
