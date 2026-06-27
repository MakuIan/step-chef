import type { RequestHandler } from './$types';
import { PUBLIC_CONVEX_SITE_URL } from '$env/static/public';

export const fallback: RequestHandler = async ({ request, params, url }) => {
	// Construct the target Convex URL
	const targetUrl = new URL(`${PUBLIC_CONVEX_SITE_URL}/api/auth/${params.all}${url.search}`);

	// Clone the request headers
	const headers = new Headers(request.headers);
	headers.delete('host');
	headers.delete('connection');

	// Forward request to Convex
	const res = await fetch(targetUrl, {
		method: request.method,
		headers,
		body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : undefined,
		redirect: 'manual'
	});

	// Clone response headers (especially Set-Cookie)
	const resHeaders = new Headers(res.headers);

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: resHeaders
	});
};
