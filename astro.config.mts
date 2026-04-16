import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://cedar4st.com',
	base: 'cedar-photography-portfolio',
	vite: {
		plugins: [tailwindcss()],
	},
});
