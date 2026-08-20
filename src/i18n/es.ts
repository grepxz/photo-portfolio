import type { Strings } from './types.ts';

const es: Strings = {
	nav: { home: 'Inicio', gallery: 'Galería', book: 'Reservar', language: 'Idioma' },
	hero: {
		word: 'buena foto',
		partOfSpeech: 'sustantivo',
		countable: '[ contable ]',
		ipa: '/ˈbwena ˈfoto/',
		definition: 'prueba de que, por un instante, saliste bien.',
		attribution: 'Hanna — fotógrafa de bodas, eventos y documental en Barcelona',
		viewGallery: 'Ver galería',
	},
	home: {
		introHeading: 'Fotografía en Barcelona',
		paragraphs: [
			'Fotografío <a href="/es/collections/weddings/">bodas</a>, <a href="/es/collections/events/">eventos</a> y <a href="/es/collections/activism/">trabajo documental</a> en Barcelona y allá donde me lleve el encargo. Trabajo con la emoción real, la reacción genuina, el movimiento natural y una edición mínima.',
			'Eso incluye ceremonias y celebraciones, cenas de empresa y noches de networking, deporte, conciertos y <a href="/es/collections/events/nightclub/">vida nocturna</a>, además de proyectos periodísticos de largo recorrido: el Orgullo en Barcelona, una protesta por los derechos de los inmigrantes de la comunidad mexicana de Houston y un homenaje de la comunidad ucraniana de Houston en el aniversario de la guerra.',
			'Trabajo en español y en inglés, y buena parte de mis encargos en Barcelona son con visitantes y con personas que acaban de mudarse aquí. Viajo para trabajar: el trabajo documental y de eventos que verás abajo se fotografió en Barcelona, en la Costa Brava y en Houston, Texas.',
			'También hay trabajo que estoy construyendo ahora mismo, con tarifas reducidas o en TFP, incluidas sesiones creativas y conceptuales. <a href="/es/book/">Tienes los detalles en la página de reservas.</a>',
		],
	},
	featured: { works: 'Trabajos destacados', work: 'Trabajo destacado' },
	gallery: { all: 'Todo', allOf: 'Todo en {name}', breadcrumb: 'Galería' },
	book: {
		heading: 'Reserva conmigo',
		bookService: 'Reservar mi servicio',
		bookEmail: 'Reservar por correo',
		bookConsultation: 'Reservar una consulta',
		profileAlt: 'Hanna editando una fotografía en DaVinci Resolve',
	},
	meta: {
		home: {
			title: 'Fotógrafa en Barcelona',
			description:
				'Hanna es fotógrafa de bodas, eventos y documental en Barcelona. Bodas, vida nocturna, conciertos, deporte y trabajo periodístico.',
		},
		book: {
			title: 'Reservar fotógrafa en Barcelona',
			description:
				'Reserva a Hanna para bodas, eventos, retratos y trabajo documental en Barcelona. Tarifas reducidas y TFP para sesiones seleccionadas.',
		},
	},
};

export default es;
