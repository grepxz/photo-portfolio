import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { SITE } from './src/seo/defaults.ts';

// https://astro.build/config
export default defineConfig({
	site: SITE,
	i18n: {
		locales: ['en', 'es'],
		defaultLocale: 'en',
		routing: { prefixDefaultLocale: false },
	},
	integrations: [
		sitemap({
			i18n: {
				defaultLocale: 'en',
				locales: { en: 'en', es: 'es' },
			},
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
