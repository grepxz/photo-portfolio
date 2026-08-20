/**
 * Post-build SEO assertions.
 *
 * Runs against dist/ rather than as a unit test, because the thing worth
 * checking is the rendered output of every route, not any one function.
 */
import { promises as fs } from 'fs';
import fg from 'fast-glob';
import { SITE } from '../src/seo/defaults.ts';

interface Alternate {
	hreflang: string;
	href: string;
}

interface PageMeta {
	file: string;
	title: string;
	description: string;
	canonical: string;
	h1Count: number;
	filenameAlts: number;
	hreflangs: Alternate[];
}

const extract = (html: string, pattern: RegExp): string => html.match(pattern)?.[1]?.trim() ?? '';

const read = async (file: string): Promise<PageMeta> => {
	const html = await fs.readFile(file, 'utf8');
	return {
		file,
		title: extract(html, /<title>([^<]*)<\/title>/),
		description: extract(html, /<meta name="description" content="([^"]*)"/),
		canonical: extract(html, /<link rel="canonical" href="([^"]*)"/),
		h1Count: (html.match(/<h1[\s>]/g) ?? []).length,
		filenameAlts: (html.match(/alt="(?:Img|Pride) \d+"/g) ?? []).length,
		hreflangs: [...html.matchAll(/<link rel="alternate" hreflang="([^"]*)" href="([^"]*)"/g)].map(
			([, hreflang, href]) => ({ hreflang, href }),
		),
	};
};

const exists = async (file: string): Promise<boolean> => {
	try {
		await fs.access(file);
		return true;
	} catch {
		return false;
	}
};

/** Maps an advertised alternate URL to the dist/ file that must exist for it to resolve. */
const hreflangTarget = (href: string): string => `dist${href.slice(SITE.length)}index.html`;

/** dist/es/foo/index.html -> dist/foo/index.html, so an es: fallback can be spotted. */
const englishCounterpartFile = (file: string): string | null => {
	const match = /^dist\/es\/(.*)$/.exec(file);
	return match ? `dist/${match[1]}` : null;
};

const duplicates = (pages: PageMeta[], key: 'title' | 'description'): string[] => {
	const seen = new Map<string, string[]>();
	for (const page of pages) {
		seen.set(page[key], [...(seen.get(page[key]) ?? []), page.file]);
	}
	return [...seen.entries()]
		.filter(([, files]) => files.length > 1)
		.map(
			([value, files]) =>
				`  ${key} "${value}" shared by:\n${files.map((f) => `    ${f}`).join('\n')}`,
		);
};

const main = async () => {
	const files = await fg('dist/**/*.html');
	if (files.length === 0) {
		console.error('No HTML found in dist/. Run `npm run build` first.');
		process.exit(1);
	}

	const pages = await Promise.all(files.map(read));
	const byFile = new Map(pages.map((page) => [page.file, page]));
	const problems: string[] = [];

	for (const page of pages) {
		if (!page.title) problems.push(`  missing title: ${page.file}`);
		if (!page.description) problems.push(`  missing description: ${page.file}`);
		if (!page.canonical) problems.push(`  missing canonical: ${page.file}`);
		if (page.h1Count !== 1) problems.push(`  ${page.h1Count} h1 elements: ${page.file}`);
		if (/^[A-Za-z]+ \d+(?: — Cedar4st)?$/.test(page.title))
			problems.push(`  filename-style title: ${page.file}`);
		if (page.filenameAlts > 0)
			problems.push(`  ${page.filenameAlts} filename-style alt attributes: ${page.file}`);

		for (const alt of page.hreflangs) {
			const target = hreflangTarget(alt.href);
			if (!(await exists(target))) {
				problems.push(
					`  hreflang="${alt.hreflang}" on ${page.file} points at ${alt.href}, but ` +
						`${target} does not exist in dist/`,
				);
			}
		}

		const english = englishCounterpartFile(page.file);
		const englishPage = english ? byFile.get(english) : undefined;
		if (englishPage) {
			if (page.title && page.title === englishPage.title)
				problems.push(
					`  ${page.file} has the same title as its English counterpart ` +
						`${englishPage.file}, so its es: copy is missing`,
				);
			if (page.description && page.description === englishPage.description)
				problems.push(
					`  ${page.file} has the same description as its English counterpart ` +
						`${englishPage.file}, so its es: copy is missing`,
				);
		}
	}

	problems.push(...duplicates(pages, 'title'), ...duplicates(pages, 'description'));

	if (problems.length > 0) {
		console.error(`SEO check failed across ${pages.length} pages:\n${problems.join('\n')}`);
		process.exit(1);
	}

	console.log(`SEO check passed: ${pages.length} pages, all unique.`);
};

main().catch((err: unknown) => {
	console.error(`SEO check crashed: ${err instanceof Error ? err.message : String(err)}`);
	process.exit(1);
});
