import { getImage } from 'astro:assets';
import { getImages } from './imageStore.ts';
import { featuredCollectionId } from './imageStore.ts';
import type { Image } from './galleryData.ts';

/**
 * A photo prepared for the parallax wall: a small WebP thumbnail used purely as
 * a WebGL texture. Full-size gallery images would cost hundreds of MB of VRAM.
 */
export interface WallImage {
	src: string;
	width: number;
	height: number;
}

/**
 * Texture dimensions. Sprites draw at 160 CSS px base times each layer's scale,
 * so the nearest layer peaks near 276 px and the farthest near 92 px. 320 px
 * covers every layer on a 1x display and all but the nearest at 2x.
 *
 * Quality is deliberately below the default: these are small, constantly moving,
 * partly transparent sprites, where compression artefacts are not perceptible.
 */
const TEXTURE_WIDTH = 320;
const TEXTURE_QUALITY = 65;

/**
 * Returns the collection an image should be counted under. Images carry
 * 'featured' alongside their real collection, so that built-in id is skipped.
 */
const primaryCollectionOf = (image: Image): string =>
	image.collections.find((c) => c !== featuredCollectionId) ?? featuredCollectionId;

/**
 * Picks indices spread evenly across a collection rather than clustering at its
 * start, so a wall drawn from 48 nightclub photos samples the whole set.
 */
function spreadIndices(total: number, wanted: number): number[] {
	if (total === 0 || wanted <= 0) return [];
	const stride = Math.max(1, Math.floor(total / wanted));
	const indices: number[] = [];
	for (let i = 0; i < total && indices.length < wanted; i += stride) {
		indices.push(i);
	}
	return indices;
}

/**
 * Selects photos evenly across every collection, so smaller collections are
 * represented alongside large ones instead of being drowned out.
 *
 * The selection is deterministic - no randomness at build time - so repeated
 * builds produce the same wall. Shuffling happens at runtime instead.
 */
export async function getWallImages(count = 50): Promise<WallImage[]> {
	const all = await getImages();

	const byCollection = new Map<string, Image[]>();
	for (const image of all) {
		const key = primaryCollectionOf(image);
		const bucket = byCollection.get(key);
		if (bucket) bucket.push(image);
		else byCollection.set(key, [image]);
	}

	// Sorted keys keep the round-robin order stable across builds.
	const keys = [...byCollection.keys()].sort();
	if (keys.length === 0) return [];

	const perCollection = Math.ceil(count / keys.length);
	const queues = keys.map((key) => {
		const images = byCollection.get(key)!;
		return spreadIndices(images.length, perCollection).map((i) => images[i]);
	});

	// Round-robin across collections until we hit the target count. Collections
	// that run dry are simply skipped, so larger ones fill any remainder.
	const selected: Image[] = [];
	for (let round = 0; selected.length < count; round++) {
		const before = selected.length;
		for (const queue of queues) {
			if (selected.length >= count) break;
			if (round < queue.length) selected.push(queue[round]);
		}
		if (selected.length === before) break; // every queue exhausted
	}

	return Promise.all(
		selected.map(async (image) => {
			const thumb = await getImage({
				src: image.src,
				width: TEXTURE_WIDTH,
				format: 'webp',
				quality: TEXTURE_QUALITY,
			});
			return { src: thumb.src, width: thumb.attributes.width, height: thumb.attributes.height };
		}),
	);
}
