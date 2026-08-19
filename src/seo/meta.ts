import {
	BRAND,
	DEFAULT_LOCALE,
	DEFAULT_OG_IMAGE,
	SITE,
	TITLE_SEPARATOR,
	type Locale,
} from './defaults.ts';

export interface MetaInput {
	/** Page title without the brand suffix. */
	title: string;
	description: string;
	/** Site-relative path, with or without leading and trailing slashes. */
	path: string;
	/** Site-relative or absolute image URL. Falls back to DEFAULT_OG_IMAGE. */
	image?: string;
	locale?: Locale;
}

export interface ResolvedMeta {
	title: string;
	description: string;
	canonical: string;
	og: {
		title: string;
		description: string;
		url: string;
		image: string;
		type: 'website';
		locale: Locale;
	};
	twitter: {
		card: 'summary_large_image';
		title: string;
		description: string;
		image: string;
	};
}

/** Appends the brand unless the title already carries it. */
export const composeTitle = (title: string): string => {
	const trimmed = title.trim();
	return trimmed.includes(BRAND) ? trimmed : `${trimmed}${TITLE_SEPARATOR}${BRAND}`;
};

/**
 * Absolute canonical URL with a trailing slash.
 *
 * Astro's default build format is 'directory', so every route is served at a
 * trailing-slash URL. Canonicals must agree or they self-conflict.
 */
export const canonicalFor = (path: string): string => {
	const trimmed = path.trim().replace(/^\/+/, '').replace(/\/+$/, '');
	return trimmed === '' ? `${SITE}/` : `${SITE}/${trimmed}/`;
};

const absoluteUrl = (value: string): string =>
	/^https?:\/\//.test(value) ? value : `${SITE}${value.startsWith('/') ? '' : '/'}${value}`;

export const buildMeta = (input: MetaInput): ResolvedMeta => {
	const title = composeTitle(input.title);
	const description = input.description.trim();
	const canonical = canonicalFor(input.path);
	const image = absoluteUrl(input.image ?? DEFAULT_OG_IMAGE);
	const locale = input.locale ?? DEFAULT_LOCALE;

	return {
		title,
		description,
		canonical,
		og: { title, description, url: canonical, image, type: 'website', locale },
		twitter: { card: 'summary_large_image', title, description, image },
	};
};
