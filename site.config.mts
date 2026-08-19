import type { AstroInstance } from 'astro';
import { Github, Instagram } from 'lucide-astro';

export interface SocialLink {
	name: string;
	url: string;
	icon: AstroInstance;
}

export default {
	title: 'Cedar4st',
	favicon: 'favicon.ico',
	owner: 'Hanna',
	profileImage: 'profile.webp',
	calcom: {
		link: 'bluecatch/consultation',
		namespace: 'consultation',
		origin: 'https://app.cal.com',
	},
	socialLinks: [
		{
			name: 'GitHub',
			url: 'https://github.com/rockem/astro-photography-portfolio',
			icon: Github,
		} as SocialLink,
		{
			name: 'Instagram',
			url: 'https://www.instagram.com',
			icon: Instagram,
		} as SocialLink,
	],
};
