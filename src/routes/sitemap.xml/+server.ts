import { error } from "@sveltejs/kit";

import { getCanonicalOrigin } from "$lib/server/page-metadata";
import { getPublishedLessonEntries } from "$lib/server/published-lessons";
import { buildSitemap } from "$lib/server/sitemap";

import type { RequestHandler } from "./$types";

// Dynamic, not prerendered: the response must vary by request host so preview
// and other non-canonical hosts return 404 (see below) instead of serving a
// static asset that advertises the production sitemap everywhere.
export const prerender = false;

// Static indexable documents, in canonical order. Lesson URLs are appended from
// the active publication. Contract: docs/search-indexing.md > "Sitemap membership".
const STATIC_PATHS = ["/", "/about", "/learn"] as const;

export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const origin = getCanonicalOrigin();

	// The sitemap is a production-only document. On preview and any other
	// non-canonical host, event.url.host is the deploy host (e.g. *.workers.dev),
	// not the canonical host — so 404 rather than advertise the production
	// sitemap off-domain. Contract: "Preview /sitemap.xml must be absent and
	// return 404."
	if (url.host !== new URL(origin).host) {
		error(404, "Not found");
	}

	const lessons = await getPublishedLessonEntries();
	const paths = [...STATIC_PATHS, ...lessons.map((lesson) => `/learn/${lesson.id}`)];

	setHeaders({
		"content-type": "application/xml",
		"cache-control": "public, max-age=3600",
	});

	return new Response(buildSitemap(origin, paths));
};
