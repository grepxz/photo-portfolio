/**
 * Post-build SEO assertions.
 *
 * Runs against dist/ rather than as a unit test, because the thing worth
 * checking is the rendered output of every route, not any one function.
 */
import { promises as fs } from 'fs';
import fg from 'fast-glob';

interface PageMeta {
	file: string;
	title: string;
	description: string;
	canonical: string;
	h1Count: number;
	filenameAlts: number;
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
	};
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
	const problems: string[] = [];

	for (const page of pages) {
		if (!page.title) problems.push(`  missing title: ${page.file}`);
		if (!page.description) problems.push(`  missing description: ${page.file}`);
		if (!page.canonical) problems.push(`  missing canonical: ${page.file}`);
		if (page.h1Count !== 1) problems.push(`  ${page.h1Count} h1 elements: ${page.file}`);
		if (/^Img \d+$/.test(page.title)) problems.push(`  filename-style title: ${page.file}`);
		if (page.filenameAlts > 0)
			problems.push(`  ${page.filenameAlts} filename-style alt attributes: ${page.file}`);
	}

	problems.push(...duplicates(pages, 'title'), ...duplicates(pages, 'description'));

	if (problems.length > 0) {
		console.error(`SEO check failed across ${pages.length} pages:\n${problems.join('\n')}`);
		process.exit(1);
	}

	console.log(`SEO check passed: ${pages.length} pages, all unique.`);
};

main();
