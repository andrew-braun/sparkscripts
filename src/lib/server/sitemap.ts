import { validateProductionOrigin } from "../config/site.ts";

/**
 * Serializes an XML sitemap from a validated production origin and a list of
 * absolute-from-root paths. Contract: `docs/search-indexing.md`.
 *
 * The contract is deliberately minimal: absolute HTTPS `<loc>` URLs only, no
 * `lastmod`, `changefreq`, or `priority` (we have no honest source for them).
 * Output is deterministic — caller order is preserved after de-duplication — so
 * the automated readiness check can compare URL sets exactly.
 */
export function buildSitemap(origin: string, paths: string[]): string {
	// Revalidate here rather than trusting the caller: a malformed origin would
	// otherwise emit non-canonical `<loc>` URLs that pollute the index.
	const canonicalOrigin = validateProductionOrigin(origin);

	const seen = new Set<string>();
	const locs: string[] = [];

	for (const path of paths) {
		if (!path.startsWith("/")) {
			throw new TypeError(`Sitemap path must be absolute from root: ${path}`);
		}
		// `/` is the only path that keeps its trailing slash; every other canonical
		// path is slashless per the indexing contract.
		const normalized = path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
		const url = `${canonicalOrigin}${normalized}`;
		if (seen.has(url)) continue;
		seen.add(url);
		locs.push(`\t<url>\n\t\t<loc>${escapeXml(url)}</loc>\n\t</url>`);
	}

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs.join("\n")}\n</urlset>\n`;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
