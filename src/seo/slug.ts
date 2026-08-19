/**
 * Collection ids mirror directory names on disk, which contain spaces and
 * capitals. Those serve as percent-encoded URLs, which read badly in search
 * results and split link equity when some inbound links encode and others do
 * not. Slugs are a presentation concern only: ids and directories are untouched.
 */

export class SlugCollisionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SlugCollisionError';
	}
}

export const slugifySegment = (segment: string): string =>
	segment
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export const slugifyId = (id: string): string => id.split('/').map(slugifySegment).join('/');

/**
 * Builds the slug -> id lookup used to resolve an incoming route back to the
 * collection it names. Throws rather than silently dropping a collection if two
 * ids collapse to the same slug.
 */
export const buildSlugMap = (ids: string[]): Map<string, string> => {
	const map = new Map<string, string>();
	for (const id of ids) {
		const slug = slugifyId(id);
		const existing = map.get(slug);
		if (existing !== undefined && existing !== id) {
			throw new SlugCollisionError(
				`Collections '${existing}' and '${id}' both slugify to '${slug}'`,
			);
		}
		map.set(slug, id);
	}
	return map;
};
